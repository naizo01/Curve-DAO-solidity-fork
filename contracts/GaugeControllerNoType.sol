pragma solidity 0.8.18;

/***
 *@title Gauge Controller
 * SPDX-License-Identifier: MIT
 *@notice Controls liquidity gauges and the issuance of token through the gauges
 */

//dao-contracts
import "./interfaces/ICRV.sol";
import "./interfaces/IVotingEscrow.sol";

contract GaugeControllerNoType {
    // 7 * 86400 seconds - all future times are rounded by week
    // uint256 constant WEEK = 604800;
    uint256 constant WEEK = 7 days;

    // Cannot change weight votes more often than once in 10 days.
    uint256 constant WEIGHT_VOTE_DELAY = 10 days;

    struct Point {
        uint256 bias;
        uint256 slope;
    }

    struct VotedSlope {
        uint256 slope;
        uint256 power;
        uint256 end;
    }

    event CommitOwnership(address admin);
    event ApplyOwnership(address admin);

    event NewGaugeWeight(
        address gaugeAddress,
        uint256 time,
        uint256 weight,
        uint256 totalWeight
    );
    event VoteForGauge(
        uint256 time,
        address user,
        address gaugeAddr,
        uint256 weight
    );
    event NewGauge(address addr, uint256 weight);

    uint256 constant MULTIPLIER = 10 ** 18;

    // Can and will be a smart contract
    address public admin;
    // Can and will be a smart contract
    address public futureAdmin;
    // CRV token
    address public token;
    // Voting escrow
    address public votingEscrow;

    int128 public nGauges; //number of gauges

    // Needed for enumeration
    mapping(address => int128) public gauges;

    // we increment values by 1 prior to storing them here so we can rely on a value
    // of zero as meaning the gauge has not been set    mapping(address => int128) gaugeTypes;
    // mapping(address => int128) public gaugeTypes_;

    mapping(address => mapping(address => VotedSlope)) public voteUserSlopes; // user -> gauge_addr -> VotedSlope

    mapping(address => uint256) public voteUserPower; // Total vote power used by user
    mapping(address => mapping(address => uint256)) public lastUserVote; // Last user vote's timestamp for each gauge address

    // Past and scheduled points for gauge weight, sum of weights per type, total weight
    // Point is for bias+slope
    // changes_* are for changes in slope
    // time_* are for the last change timestamp
    // timestamps are rounded to whole weeks

    mapping(address => mapping(uint256 => Point)) public pointsWeight; // gauge_addr -> time -> Point
    mapping(address => mapping(uint256 => uint256)) public changesWeight; // gauge_addr -> time -> slope
    mapping(address => uint256) public timeWeight; // gauge_addr -> last scheduled time (next week)

    mapping(uint256 => Point) public pointsSum; // type_id -> time -> Point
    mapping(uint256 => uint256) public changesSum; // type_id -> time -> slope
    // uint256[1000000000] public timeSum; // type_id -> last scheduled time (next week)
    uint256 public timeSum; // last scheduled time (next week)

    mapping(uint256 => uint256) public pointsTotal; // time -> total weight
    uint256 public timeTotal; // last scheduled time

    /***
     *@notice Contract constructor
     *@param _token `Token` contract address
     *@param _votingEscrow `VotingEscrow` contract address
     */
    constructor(address token_, address votingEscrow_) {
        require(token_ != address(0));
        require(votingEscrow_ != address(0));

        admin = msg.sender;
        token = token_;
        votingEscrow = votingEscrow_;
        timeTotal = (block.timestamp / WEEK) * WEEK;
    }

    /***
     * @notice Transfer ownership of GaugeController to `addr`
     * @param addr_ Address to have ownership transferred to
     */
    function commitTransferOwnership(address addr_) external onlyAdmin {
        futureAdmin = addr_;
        emit CommitOwnership(addr_);
    }

    /***
     * @notice Apply pending ownership transfer
     */
    function applyTransferOwnership() external onlyAdmin {
        address _admin = futureAdmin;
        require(_admin != address(0), "admin not set");
        admin = _admin;
        emit ApplyOwnership(_admin);
    }

    /***
     *@notice Fill sum of gauge weights for the same type week-over-week for
     *        missed checkins and return the sum for the future week
     *@return Sum of weights
     */
    function _getSum() internal returns (uint256) {
        uint256 _t = timeSum;
        if (_t > 0) {
            Point memory _pt = pointsSum[_t];
            for (uint256 i; i < 500; ) {
                if (_t > block.timestamp) {
                    break;
                }
                _t += WEEK;
                uint256 _dBias = _pt.slope * WEEK;
                if (_pt.bias > _dBias) {
                    _pt.bias -= _dBias;
                    uint256 _dSlope = changesSum[_t];
                    _pt.slope -= _dSlope;
                } else {
                    _pt.bias = 0;
                    _pt.slope = 0;
                }
                pointsSum[_t] = _pt;
                if (_t > block.timestamp) {
                    timeSum = _t;
                }
                unchecked {
                    ++i;
                }
            }
            return _pt.bias;
        } else {
            return 0;
        }
    }

    /***
     *@notice Fill historic total weights week-over-week for missed checkins
     *        and return the total for the future week
     *@return Total weight
     */
    function _getTotal() internal returns (uint256) {
        uint256 _t = timeTotal;
        if (_t > block.timestamp) {
            // If we have already checkpointed - still need to change the value
            _t -= WEEK;
        }
        uint256 _pt = pointsTotal[_t];


        _getSum();

        for (uint256 i; i < 500; ) {
            if (_t > block.timestamp) {
                break;
            }
            _t += WEEK;
            _pt = 0;
            // Scales as n_types * n_unchecked_weeks (hopefully 1 at most)

            uint256 _sum = pointsSum[_t].bias;
            _pt += _sum;
            pointsTotal[_t] = _pt;

            if (_t > block.timestamp) {
                timeTotal = _t;
            }
            unchecked {
                ++i;
            }
        }
        return _pt;
    }

    /***
     *@notice Fill historic gauge weights week-over-week for missed checkins
     *        and return the total for the future week
     *@param gaugeAddr_ Address of the gauge
     *@return Gauge weight
     */
    function _getWeight(address gaugeAddr_) internal returns (uint256) {
        uint256 _t = timeWeight[gaugeAddr_];
        if (_t > 0) {
            Point memory _pt = pointsWeight[gaugeAddr_][_t];
            for (uint256 i; i < 500; ) {
                if (_t > block.timestamp) {
                    break;
                }
                _t += WEEK;
                uint256 _dBias = _pt.slope * WEEK;
                if (_pt.bias > _dBias) {
                    _pt.bias -= _dBias;
                    uint256 _dSlope = changesWeight[gaugeAddr_][_t];
                    _pt.slope -= _dSlope;
                } else {
                    _pt.bias = 0;
                    _pt.slope = 0;
                }
                pointsWeight[gaugeAddr_][_t] = _pt;
                if (_t > block.timestamp) {
                    timeWeight[gaugeAddr_] = _t;
                }
                unchecked {
                    ++i;
                }
            }
            return _pt.bias;
        } else {
            return 0;
        }
    }

    /***
     *@notice Add gauge `addr` of type `gauge_type` with weight `weight`
     *@param addr_ Gauge address
     */
    function addGauge(
        address addr_,
        uint256 weight_
    ) external onlyAdmin {
        require(gauges[addr_] == 0, "cannot add the same gauge twice");
        int128 _n = nGauges;
        unchecked {
            nGauges = _n + 1;
        }
        gauges[addr_] = nGauges;
        uint256 _nextTime;
        unchecked {
            _nextTime = ((block.timestamp + WEEK) / WEEK) * WEEK;
        }

        if (weight_ > 0) {
            uint256 _oldSum = _getSum();
            uint256 _oldTotal = _getTotal();

            pointsSum[_nextTime].bias = weight_ + _oldSum;
            timeSum = _nextTime;
            pointsTotal[_nextTime] = _oldTotal + (weight_);
            timeTotal = _nextTime;

            pointsWeight[addr_][_nextTime].bias = weight_;
        }
        if (timeSum == 0) {
            timeSum = _nextTime;
        }
        timeWeight[addr_] = _nextTime;

        emit NewGauge(addr_, weight_);
    }

    /***
     * @notice Checkpoint to fill data common for all gauges
     */
    function checkpoint() external {
        _getTotal();
    }

    /***
     *@notice Checkpoint to fill data for both a specific gauge and common for all gauges
     *@param addr_ Gauge address
     */
    function checkpointGauge(address addr_) external {
        _getWeight(addr_);
        _getTotal();
    }

    /***
     *@notice Get Gauge relative weight (not more than 1.0) normalized to 1e18
     *        (e.g. 1.0 == 1e18). Inflation which will be received by it is
     *       inflation_rate * relative_weight / 1e18
     *@param addr_ Gauge address
     *@param time_ Relative weight at the specified timestamp in the past or present
     *@return Value of relative weight normalized to 1e18
     */
    function _gaugeRelativeWeight(
        address addr_,
        uint256 time_
    ) internal view returns (uint256) {
        uint256 _t = (time_ / WEEK) * WEEK;
        uint256 _totalWeight = pointsTotal[_t];

        if (_totalWeight > 0) {
            uint256 _gaugeWeight = pointsWeight[addr_][_t].bias;

            return (MULTIPLIER * _gaugeWeight) / _totalWeight;
        } else {
            return 0;
        }
    }

    /***
     *@notice Get Gauge relative weight (not more than 1.0) normalized to 1e18
     *        (e.g. 1.0 == 1e18). Inflation which will be received by it is
     *        inflation_rate * relative_weight / 1e18
     *@param addr_ Gauge address
     *@param time_ Relative weight at the specified timestamp in the past or present
     *@return Value of relative weight normalized to 1e18
     */
    function gaugeRelativeWeight(
        address addr_,
        uint256 time_
    ) external view returns (uint256) {
        //default value
        if (time_ == 0) {
            time_ = block.timestamp;
        }

        return _gaugeRelativeWeight(addr_, time_);
    }

    function gaugeRelativeWeightWrite(
        address addr_,
        uint256 time_
    ) external returns (uint256) {
        //default value
        if (time_ == 0) {
            time_ = block.timestamp;
        }

        _getWeight(addr_);
        _getTotal(); // Also calculates get_sum
        return _gaugeRelativeWeight(addr_, time_);
    }

    function _changeGaugeWeight(address addr_, uint256 weight_) internal {
        // Change gauge weight
        // Only needed when testing in reality
        uint256 _oldGaugeWeight = _getWeight(addr_);
        uint256 _oldSum = _getSum();
        uint256 _totalWeight = _getTotal();
        uint256 _nextTime;
        unchecked {
            _nextTime = ((block.timestamp + WEEK) / WEEK) * WEEK;
        }

        pointsWeight[addr_][_nextTime].bias = weight_;
        timeWeight[addr_] = _nextTime;

        uint256 newSum = _oldSum + weight_ - _oldGaugeWeight;
        pointsSum[_nextTime].bias = newSum;
        timeSum = _nextTime;

        _totalWeight =
            _totalWeight +
            (newSum) -
            (_oldSum);
        pointsTotal[_nextTime] = _totalWeight;
        timeTotal = _nextTime;

        emit NewGaugeWeight(addr_, block.timestamp, weight_, _totalWeight);
    }

    /***
     *@notice Change weight of gauge `addr` to `weight`
     *@param addr_ `GaugeController` contract address
     *@param weight_ New Gauge weight
     */
    function changeGaugeWeight(
        address addr_,
        uint256 weight_
    ) external onlyAdmin {
        _changeGaugeWeight(addr_, weight_);
    }

    struct VotingParameter {
        //to avoid "Stack too deep" issue
        uint256 slope;
        uint256 lockEnd;
        uint256 _nGauges;
        uint256 nextTime;
        uint256 oldDt;
        uint256 oldBias;
    }

    /****
     *@notice Allocate voting power for changing pool weights
     *@param gaugeAddr_ Gauge which `msg.sender` votes for
     *@param userWeight_ Weight for a gauge in bps (units of 0.01%). Minimal is 0.01%. Ignored if 0. bps = basis points
     */
    function voteForGaugeWeights(
        address gaugeAddr_,
        uint256 userWeight_
    ) external {
        VotingParameter memory _vp;
        _vp.slope = uint256(
            uint128(IVotingEscrow(votingEscrow).getLastUserSlope(msg.sender))
        );
        _vp.lockEnd = IVotingEscrow(votingEscrow).lockedEnd(msg.sender);
        _vp._nGauges = uint256(uint128(nGauges));
        unchecked {
            _vp.nextTime = ((block.timestamp + WEEK) / WEEK) * WEEK;
        }
        require(_vp.lockEnd > _vp.nextTime, "Your token lock expires too soon");
        require(
            (userWeight_ >= 0) && (userWeight_ <= 10000),
            "You used all your voting power"
        );
        unchecked {
            require(
                block.timestamp >=
                    lastUserVote[msg.sender][gaugeAddr_] + WEIGHT_VOTE_DELAY,
                "Cannot vote so often"
            );
        }

        require(gauges[gaugeAddr_] > 0, "Gauge not added");

        // Prepare slopes and biases in memory
        VotedSlope memory _oldSlope = voteUserSlopes[msg.sender][gaugeAddr_];
        _vp.oldDt = 0;
        if (_oldSlope.end > _vp.nextTime) {
            _vp.oldDt = _oldSlope.end - _vp.nextTime;
        }
        _vp.oldBias = _oldSlope.slope * _vp.oldDt;
        VotedSlope memory _newSlope = VotedSlope({
            slope: (_vp.slope * userWeight_) / 10000,
            end: _vp.lockEnd,
            power: userWeight_
        });
        uint256 _newDt = _vp.lockEnd - _vp.nextTime; // dev: raises when expired
        uint256 _newBias = _newSlope.slope * _newDt;

        // Check and update powers (weights) used
        uint256 _powerUsed = voteUserPower[msg.sender];
        _powerUsed = _powerUsed + _newSlope.power - _oldSlope.power;
        voteUserPower[msg.sender] = _powerUsed;
        require(
            (_powerUsed >= 0) && (_powerUsed <= 10000),
            "Used too much power"
        );

        //// Remove old and schedule new slope changes
        // Remove slope changes for old slopes
        // Schedule recording of initial slope for nextTime
        uint256 _oldWeightBias = _getWeight(gaugeAddr_);
        uint256 _oldWeightSlope = pointsWeight[gaugeAddr_][_vp.nextTime].slope;
        uint256 _oldSumBias = _getSum();
        uint256 _oldSumSlope = pointsSum[_vp.nextTime].slope;

        pointsWeight[gaugeAddr_][_vp.nextTime].bias =
            max(_oldWeightBias + _newBias, _vp.oldBias) -
            _vp.oldBias;
        pointsSum[_vp.nextTime].bias =
            max(_oldSumBias + _newBias, _vp.oldBias) -
            _vp.oldBias;
        if (_oldSlope.end > _vp.nextTime) {
            pointsWeight[gaugeAddr_][_vp.nextTime].slope =
                max(_oldWeightSlope + _newSlope.slope, _oldSlope.slope) -
                _oldSlope.slope;
            pointsSum[_vp.nextTime].slope =
                max(_oldSumSlope + _newSlope.slope, _oldSlope.slope) -
                _oldSlope.slope;
        } else {
            pointsWeight[gaugeAddr_][_vp.nextTime].slope += _newSlope.slope;
            pointsSum[_vp.nextTime].slope += _newSlope.slope;
        }
        if (_oldSlope.end > block.timestamp) {
            // Cancel old slope changes if they still didn't happen
            changesWeight[gaugeAddr_][_oldSlope.end] -= _oldSlope.slope;
            changesSum[_oldSlope.end] -= _oldSlope.slope;
        }
        // Add slope changes for new slopes
        changesWeight[gaugeAddr_][_newSlope.end] += _newSlope.slope;
        changesSum[_newSlope.end] += _newSlope.slope;

        _getTotal();

        voteUserSlopes[msg.sender][gaugeAddr_] = _newSlope;

        // Record last action time
        lastUserVote[msg.sender][gaugeAddr_] = block.timestamp;

        emit VoteForGauge(block.timestamp, msg.sender, gaugeAddr_, userWeight_);
    }

    /***
     *@notice Get current gauge weight
     *@param addr_ Gauge address
     *@return Gauge weight
     */
    function getGaugeWeight(address addr_) external view returns (uint256) {
        return pointsWeight[addr_][timeWeight[addr_]].bias;
    }

    /***
     *@notice Get current total (type-weighted) weight
     *@return Total weight
     */
    function getTotalWeight() external view returns (uint256) {
        return pointsTotal[timeTotal];
    }

    /***
     *@notice Get sum of gauge weights per type
     *@return Sum of gauge weights
     */
    function getWeightsSumPerType(
    ) external view returns (uint256) {
        return pointsSum[timeSum].bias;
    }

    function max(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return _a >= _b ? _a : _b;
    }

    modifier onlyAdmin() {
        require(admin == msg.sender, "admin only");
        _;
    }
}
