import { expect } from "chai";
import { ethers } from "hardhat";
import {
  takeSnapshot,
  SnapshotRestorer,
} from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { deployContracts } from "../../helper";
import Constants from "../../Constants";

describe("GaugeControllerNoType", function () {
  let accounts: SignerWithAddress[];
  let gaugeControllerNoType: Contract;
  let threeGauges: String[];
  let votingEscrow: Contract;
  let token: Contract;

  let snapshot: SnapshotRestorer;

  const TYPE_WEIGHTS = Constants.TYPE_WEIGHTS;
  const ten_to_the_18 = Constants.ten_to_the_18;
  const ten_to_the_24 = Constants.ten_to_the_24;
  const year = Constants.year;
  const day = Constants.day;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    accounts = await ethers.getSigners();
    ({ gaugeControllerNoType, threeGauges, votingEscrow, token } =
      await deployContracts());

    await gaugeControllerNoType.addGauge(threeGauges[0], 0);
    await gaugeControllerNoType.addGauge(threeGauges[1], 0);

    await token.approve(votingEscrow.address, ten_to_the_24);
    await votingEscrow.createLock(
      ten_to_the_24,
      (await ethers.provider.getBlock("latest")).timestamp + year
    );
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  describe("GaugeControllerNoType voteWeightUnitary", function () {
    it("test_no_immediate_effect_on_weight", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10000);
      const weight = await gaugeControllerNoType.gaugeRelativeWeight(
        threeGauges[0],
        0
      );
      expect(weight).to.equal(0);
    });

    it("test_effect_on_following_period", async () => {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10000);

      await ethers.provider.send("evm_increaseTime", [day * 7]);

      await gaugeControllerNoType.checkpointGauge(threeGauges[0]);
      expect(
        await gaugeControllerNoType.gaugeRelativeWeight(
          threeGauges[0],
          (
            await ethers.provider.getBlock("latest")
          ).timestamp
        )
      ).to.equal(ten_to_the_18);
    });

    it("test_remove_vote_no_immediate_effect", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10000);

      await ethers.provider.send("evm_increaseTime", [day * 10]);

      await gaugeControllerNoType.checkpointGauge(threeGauges[0]);
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 0);

      expect(
        await gaugeControllerNoType.gaugeRelativeWeight(threeGauges[0], 0)
      ).to.equal(ten_to_the_18);
    });

    it("test_remove_vote_means_no_weight", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10000);

      await ethers.provider.send("evm_increaseTime", [day * 10]);
      await ethers.provider.send("evm_mine", []);

      await gaugeControllerNoType.checkpointGauge(threeGauges[0]);
      expect(
        await gaugeControllerNoType.gaugeRelativeWeight(threeGauges[0], 0)
      ).to.equal(ethers.utils.parseUnits("1", 18));

      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 0);

      await ethers.provider.send("evm_increaseTime", [day * 7]);
      await ethers.provider.send("evm_mine", []);

      await gaugeControllerNoType.checkpointGauge(threeGauges[0]);
      expect(
        await gaugeControllerNoType.gaugeRelativeWeight(threeGauges[0], 0)
      ).to.equal(0);
    });
  });
});
