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
  const day = Constants.day;
  const year = Constants.year;

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

  describe("GaugeControllerNoType vote", function () {
    it("test_vote", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10000);
      expect(await gaugeControllerNoType.voteUserPower(accounts[0].address)).to.equal(
        10000
      );
    });

    it("test_vote_partial", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 1234);
      expect(await gaugeControllerNoType.voteUserPower(accounts[0].address)).to.equal(
        1234
      );
    });

    it("test_vote_change", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 1234);

      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 42)
      ).to.be.revertedWith("Cannot vote so often");

      await ethers.provider.send("evm_increaseTime", [day * 10]);
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 42);

      expect(await gaugeControllerNoType.voteUserPower(accounts[0].address)).to.equal(
        42
      );
    });

    it("test_vote_remove", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 10000);

      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 0)
      ).to.be.revertedWith("Cannot vote so often");

      await ethers.provider.send("evm_increaseTime", [day * 10]);

      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 0);

      expect(await gaugeControllerNoType.voteUserPower(accounts[0].address)).to.equal(
        0
      );
    });

    it("test_vote_multiple", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 4000);
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 6000);

      expect(await gaugeControllerNoType.voteUserPower(accounts[0].address)).to.equal(
        10000
      );
    });

    it("test_vote_no_balance", async function () {
      await expect(
        gaugeControllerNoType
          .connect(accounts[1])
          .voteForGaugeWeights(threeGauges[0], 10000)
      ).to.be.revertedWith("Your token lock expires too soon");
    });

    it("test_vote_expired", async function () {
      await ethers.provider.send("evm_increaseTime", [year * 2]);

      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10000)
      ).to.be.revertedWith("Your token lock expires too soon");
    });

    it("test_invalid_gauge_id", async function () {
      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[2], 10000)
      ).to.be.revertedWith("Gauge not added");
    });

    it("test_over_user_weight", async function () {
      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 10001)
      ).to.be.revertedWith("You used all your voting power");
    });

    it("test_over_weight_multiple", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 8000);

      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 4000)
      ).to.be.revertedWith("Used too much power");
    });

    it("test_over_weight_adjust_existing", async function () {
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 6000);
      await gaugeControllerNoType.voteForGaugeWeights(threeGauges[1], 3000);

      await ethers.provider.send("evm_increaseTime", [day * 10]);

      await expect(
        gaugeControllerNoType.voteForGaugeWeights(threeGauges[0], 8000)
      ).to.be.revertedWith("Used too much power");
    });
  });
});
