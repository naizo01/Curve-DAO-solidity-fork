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

  const week = Constants.week;
  const year = Constants.year;
  const GAUGE_WEIGHTS = Constants.GAUGE_WEIGHTS;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    accounts = await ethers.getSigners();
    ({ gaugeControllerNoType, threeGauges } = await deployContracts());
    await gaugeControllerNoType.addGauge(threeGauges[0], GAUGE_WEIGHTS[0]);
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  describe("GaugeControllerNoType Timestamps", function () {
    it("test_timestamps", async function () {
      const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
      const expectedTime = Math.floor((currentTime + week) / week) * week;
      expect(await gaugeControllerNoType.timeTotal()).to.equal(expectedTime);

      for (let i = 0; i < 5; i++) {
        await ethers.provider.send("evm_increaseTime", [
          Math.floor(1.1 * year),
        ]);

        await gaugeControllerNoType.checkpoint();

        const newCurrentTime = (await ethers.provider.getBlock("latest"))
          .timestamp;
        const newExpectedTime =
          Math.floor((newCurrentTime + week) / week) * week;
        expect(await gaugeControllerNoType.timeTotal()).to.equal(newExpectedTime);
      }
    });
  });
});
