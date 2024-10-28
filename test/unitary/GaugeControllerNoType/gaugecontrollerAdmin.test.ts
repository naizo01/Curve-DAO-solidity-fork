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

describe.only("GaugeControllerNoType", function () {
  let accounts: SignerWithAddress[];
  let gaugeControllerNoType: Contract;
  let snapshot: SnapshotRestorer;

  const TYPE_WEIGHTS = Constants.TYPE_WEIGHTS;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    accounts = await ethers.getSigners();
    ({ gaugeControllerNoType } = await deployContracts());
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  describe("GaugeControllerNoType GaugecontrollerAdmin", function () {
    it("test_commit_admin_only", async function () {
      await expect(
        gaugeControllerNoType
          .connect(accounts[1])
          .commitTransferOwnership(accounts[1].address)
      ).to.be.revertedWith("admin only");
    });

    it("test_apply_admin_only", async function () {
      await expect(
        gaugeControllerNoType.connect(accounts[1]).applyTransferOwnership()
      ).to.be.revertedWith("admin only");
    });

    it("test_commit_transfer_ownership", async function () {
      await gaugeControllerNoType.commitTransferOwnership(accounts[1].address);

      expect(await gaugeControllerNoType.admin()).to.equal(
        await accounts[0].getAddress()
      );
      expect(await gaugeControllerNoType.futureAdmin()).to.equal(accounts[1].address);
    });

    it("test_apply_transfer_ownership", async function () {
      await gaugeControllerNoType.commitTransferOwnership(accounts[1].address);
      await gaugeControllerNoType.applyTransferOwnership();

      expect(await gaugeControllerNoType.admin()).to.equal(accounts[1].address);
    });

    it("test_apply_without_commit", async function () {
      await expect(gaugeControllerNoType.applyTransferOwnership()).to.be.revertedWith(
        "admin not set"
      );
    });
  });
});
