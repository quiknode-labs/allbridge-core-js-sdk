import { Horizon, NotFoundError } from "@stellar/stellar-sdk";
import { ChainDecimalsByType, ChainSymbol, ChainType, getChainProperty } from "../../../chains";
import { AllbridgeCoreClient } from "../../../client/core-api";
import { AllbridgeCoreSdkOptions, SdkError } from "../../../index";
import { GetTokenBalanceParams, MethodNotSupportedError, TransactionResponse } from "../../../models";
import { convertFloatAmountToInt } from "../../../utils/calculation";
import { GetNativeTokenBalanceParams } from "../../bridge/models";
import { NodeRpcUrlsConfig } from "../../index";
import { RawTransaction } from "../../models";
import { ChainTokenService } from "../models";

import BalanceLineAsset = Horizon.HorizonApi.BalanceLineAsset;
import BalanceLineNative = Horizon.HorizonApi.BalanceLineNative;

export class SrbTokenService extends ChainTokenService {
  chainType: ChainType.SRB = ChainType.SRB;

  constructor(
    readonly nodeRpcUrlsConfig: NodeRpcUrlsConfig,
    readonly params: AllbridgeCoreSdkOptions,
    readonly api: AllbridgeCoreClient
  ) {
    super();
  }

  getAllowance(): Promise<string> {
    throw new MethodNotSupportedError();
  }

  async getTokenBalance(params: GetTokenBalanceParams): Promise<string> {
    if (!params.token.originTokenAddress) {
      throw new SdkError("OriginTokenAddress missing");
    }
    const [symbol, srbTokenAddress] = params.token.originTokenAddress.split(":");

    const stellar = new Horizon.Server(this.nodeRpcUrlsConfig.getNodeRpcUrl(ChainSymbol.STLR));
    let stellarAccount;
    try {
      stellarAccount = await stellar.loadAccount(params.account);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return "0";
      }
      throw err;
    }
    const balances = stellarAccount.balances;

    const balanceInfo = balances.find(
      (balance): balance is BalanceLineAsset =>
        (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") &&
        balance.asset_code == symbol &&
        balance.asset_issuer == srbTokenAddress
    );
    if (balanceInfo?.balance) {
      return convertFloatAmountToInt(
        balanceInfo.balance,
        ChainDecimalsByType[getChainProperty(params.token.chainSymbol).chainType]
      ).toFixed();
    }
    return "0";
  }

  async getNativeTokenBalance(params: GetNativeTokenBalanceParams): Promise<string> {
    const stellar = new Horizon.Server(this.nodeRpcUrlsConfig.getNodeRpcUrl(ChainSymbol.STLR));
    const stellarAccount = await stellar.loadAccount(params.account);
    const balances = stellarAccount.balances;

    const nativeBalance = balances.find((balance): balance is BalanceLineNative => balance.asset_type === "native");
    if (nativeBalance?.balance) {
      return convertFloatAmountToInt(
        nativeBalance.balance,
        ChainDecimalsByType[getChainProperty(params.chainSymbol).chainType]
      ).toFixed();
    }
    return "0";
  }

  approve(): Promise<TransactionResponse> {
    throw new MethodNotSupportedError();
  }

  buildRawTransactionApprove(): Promise<RawTransaction> {
    throw new MethodNotSupportedError();
  }
}
