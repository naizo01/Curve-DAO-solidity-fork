import { ethers } from "hardhat";
import { expect } from "chai";
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
  let snapshot: SnapshotRestorer;

  const WEEK = Constants.WEEK;
  const YEAR = Constants.YEAR;
  const GAUGE_WEIGHTS = Constants.GAUGE_WEIGHTS;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    accounts = await ethers.getSigners();
    ({ gaugeControllerNoType, threeGauges } = await deployContracts());
  });

  afterEach(async () => {
    await snapshot.restore();
  });
  describe("GaugeControllerNoType GaugesWeights", function () {
    it("test_add_gauges", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);
      await gaugeControllerNoType.addGauge(threeGauges[1], GAUGE_WEIGHTS[1]);

      expect(await gaugeControllerNoType.gauges(threeGauges[0])).to.equal(1);
      expect(await gaugeControllerNoType.gauges(threeGauges[1])).to.equal(2);
    });

    it("test_n_gauges", async function () {
      expect(await gaugeControllerNoType.nGauges()).to.equal(0);

      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);
      await gaugeControllerNoType.addGauge(threeGauges[1], GAUGE_WEIGHTS[1]);

      expect(await gaugeControllerNoType.nGauges()).to.equal(2);
    });

    it("test_n_gauges_same_gauge", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);
      await expect(
        gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0])
      ).to.be.revertedWith("cannot add the same gauge twice");
    });

    it("test_gauge_weight", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);

      expect(await gaugeControllerNoType.getGaugeWeight(threeGauges[0])).to.equal(
        GAUGE_WEIGHTS[0]
      );
    });

    it("test_gauge_weight_as_zero", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], 0);

      expect(await gaugeControllerNoType.getGaugeWeight(threeGauges[0])).to.equal(0);
    });

    it("test_set_gauge_weight", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], 0);
      await gaugeControllerNoType.changeGaugeWeight(threeGauges[0], GAUGE_WEIGHTS[0]);
      await ethers.provider.send("evm_increaseTime", [WEEK.toNumber()]);

      expect(await gaugeControllerNoType.getGaugeWeight(threeGauges[0])).to.equal(
        GAUGE_WEIGHTS[0]
      );
    });

    it("test_relative_weight_write", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);
      await gaugeControllerNoType.addGauge(threeGauges[1], GAUGE_WEIGHTS[1]);
      await gaugeControllerNoType.addGauge(threeGauges[2], GAUGE_WEIGHTS[2]);
      await ethers.provider.send("evm_increaseTime", [YEAR.toNumber()]);

      const expectedWeight = GAUGE_WEIGHTS[0]
        .add(GAUGE_WEIGHTS[1])
        .add(GAUGE_WEIGHTS[2]);

      for (let i = 0; i < threeGauges.length; i++) {
        const relativeWeight = await gaugeControllerNoType.gaugeRelativeWeight(
          threeGauges[i],
          0
        );
        expect(relativeWeight).to.equal(
          GAUGE_WEIGHTS[i]
            .div(expectedWeight)
        );
      }
    });
  });
});
