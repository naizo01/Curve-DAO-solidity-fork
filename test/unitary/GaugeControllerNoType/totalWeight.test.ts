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
  let threeGauges: string[];
  let snapshot: SnapshotRestorer;

  const GAUGE_WEIGHTS = Constants.GAUGE_WEIGHTS;
  const ten_to_the_18 = Constants.ten_to_the_18;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    accounts = await ethers.getSigners();
    ({ gaugeControllerNoType, threeGauges } = await deployContracts());
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  describe("GaugeControllerNoType TotalWeight", function () {
    it("test_total_weight", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);

      expect(await gaugeControllerNoType.getTotalWeight()).to.equal(
        GAUGE_WEIGHTS[0]
      );
    });

    it("test_change_gauge_weight", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], ten_to_the_18);
      await gaugeControllerNoType.changeGaugeWeight(threeGauges[0], 31337);

      expect(await gaugeControllerNoType.getTotalWeight()).to.equal(
        31337
      );
    });

    it("test_multiple", async function () {
      await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);
      await gaugeControllerNoType.addGauge(threeGauges[1], GAUGE_WEIGHTS[1]);
      await gaugeControllerNoType.addGauge(threeGauges[2], GAUGE_WEIGHTS[2]);

      const expectedTotalWeight = GAUGE_WEIGHTS[0]
        .add(GAUGE_WEIGHTS[1])
        .add(GAUGE_WEIGHTS[2]);

      expect(await gaugeControllerNoType.getTotalWeight()).to.equal(
        expectedTotalWeight
      );
    });
  });
});
