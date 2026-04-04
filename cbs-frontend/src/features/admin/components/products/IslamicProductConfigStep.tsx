import { useQuery } from '@tanstack/react-query';
import type { BankingProduct } from '../../api/productApi';
import { getIslamicContractTypes } from '../../api/islamicProductApi';
import {
  createDefaultIslamicDraft,
  enrichIslamicDraftWithContractType,
  formatIslamicProfitDisplay,
  fromCommaSeparated,
  toCommaSeparated,
} from '../../lib/islamicProductMapper';
import type { IslamicProductCategory, IslamicProductDraft } from '../../types/islamicProduct';

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function IslamicProductConfigStep({
  product,
  onChange,
}: {
  product: Partial<BankingProduct>;
  onChange: (product: Partial<BankingProduct>) => void;
}) {
  const { data: contractTypes = [], isLoading } = useQuery({
    queryKey: ['islamic-contract-types', 'wizard'],
    queryFn: getIslamicContractTypes,
    staleTime: 300_000,
  });

  const draft = createDefaultIslamicDraft(product, product.islamicConfig);
  const selectedContractType = contractTypes.find((item) => item.id === draft.contractTypeId);
  const contractCode = selectedContractType?.code ?? draft.contractTypeCode;

  const inputCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';
  const selectCls = inputCls;

  const updateDraft = (patch: Partial<IslamicProductDraft>) => {
    onChange({
      ...product,
      islamicConfig: createDefaultIslamicDraft(product, { ...draft, ...patch }),
    });
  };

  const updateContractType = (nextId: number | undefined) => {
    const selected = contractTypes.find((item) => item.id === nextId);
    const nextDraft = enrichIslamicDraftWithContractType(
      {
        ...draft,
        contractTypeId: nextId,
        contractTypeCode: selected?.code,
        contractTypeName: selected?.name,
      },
      contractTypes,
    );
    onChange({ ...product, islamicConfig: nextDraft });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Islamic products create a Shariah-governed extension on top of the existing product shell. Configure the
        contract structure, fatwa linkage, and profit mechanics here.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Arabic Product Name</label>
          <input
            type="text"
            value={draft.nameAr ?? ''}
            onChange={(event) => updateDraft({ nameAr: event.target.value })}
            placeholder="Enter Arabic name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Contract Type</label>
          <select
            value={draft.contractTypeId ?? ''}
            onChange={(event) => updateContractType(numberOrUndefined(event.target.value))}
            className={selectCls}
          >
            <option value="">Select contract type</option>
            {contractTypes.map((contractType) => (
              <option key={contractType.id} value={contractType.id}>
                {contractType.code} — {contractType.name}
              </option>
            ))}
          </select>
          {isLoading && <p className="mt-1 text-xs text-muted-foreground">Loading contract registry...</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Arabic Description</label>
        <textarea
          rows={3}
          value={draft.descriptionAr ?? ''}
          onChange={(event) => updateDraft({ descriptionAr: event.target.value })}
          placeholder="Arabic product description"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Islamic Category</label>
          <select
            value={draft.productCategory ?? ''}
            onChange={(event) => updateDraft({ productCategory: event.target.value as IslamicProductCategory })}
            className={selectCls}
          >
            <option value="FINANCING">Financing</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="INVESTMENT">Investment</option>
            <option value="INSURANCE">Insurance</option>
            <option value="TRADE">Trade</option>
            <option value="GUARANTEE">Guarantee</option>
            <option value="AGENCY">Agency</option>
            <option value="SUKUK">Sukuk</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Sub-category</label>
          <input
            type="text"
            value={draft.subCategory ?? ''}
            onChange={(event) => updateDraft({ subCategory: event.target.value.toUpperCase() })}
            placeholder="HOME_FINANCING"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Profit Method</label>
          <select
            value={draft.profitCalculationMethod ?? ''}
            onChange={(event) => updateDraft({ profitCalculationMethod: event.target.value as IslamicProductDraft['profitCalculationMethod'] })}
            className={selectCls}
          >
            <option value="COST_PLUS_MARKUP">Cost + Markup</option>
            <option value="PROFIT_SHARING_RATIO">Profit Sharing Ratio</option>
            <option value="RENTAL_RATE">Rental Rate</option>
            <option value="EXPECTED_PROFIT_RATE">Expected Profit Rate</option>
            <option value="COMMISSION_BASED">Commission Based</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Rate Type</label>
          <select
            value={draft.profitRateType ?? ''}
            onChange={(event) => updateDraft({ profitRateType: event.target.value as IslamicProductDraft['profitRateType'] })}
            className={selectCls}
          >
            <option value="FIXED">Fixed</option>
            <option value="VARIABLE">Variable</option>
            <option value="TIERED">Tiered</option>
            <option value="STEP_UP">Step-up</option>
            <option value="STEP_DOWN">Step-down</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Fatwa ID</label>
          <input
            type="number"
            min={1}
            value={draft.fatwaId ?? ''}
            onChange={(event) => updateDraft({ fatwaId: numberOrUndefined(event.target.value) })}
            placeholder="Optional"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Effective From</label>
          <input
            type="date"
            value={draft.effectiveFrom ?? ''}
            onChange={(event) => updateDraft({ effectiveFrom: event.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Min Amount</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.minAmount ?? ''}
            onChange={(event) => updateDraft({ minAmount: numberOrUndefined(event.target.value) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max Amount</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.maxAmount ?? ''}
            onChange={(event) => updateDraft({ maxAmount: numberOrUndefined(event.target.value) })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Min Tenor (months)</label>
          <input
            type="number"
            min={0}
            value={draft.minTenorMonths ?? ''}
            onChange={(event) => updateDraft({ minTenorMonths: numberOrUndefined(event.target.value) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max Tenor (months)</label>
          <input
            type="number"
            min={0}
            value={draft.maxTenorMonths ?? ''}
            onChange={(event) => updateDraft({ maxTenorMonths: numberOrUndefined(event.target.value) })}
            className={inputCls}
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 mt-7">
          <input
            id="fatwa-required"
            type="checkbox"
            checked={draft.fatwaRequired ?? true}
            onChange={(event) => updateDraft({ fatwaRequired: event.target.checked })}
          />
          <label htmlFor="fatwa-required" className="text-sm font-medium">Fatwa required</label>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 mt-7">
          <input
            id="late-penalty-charity"
            type="checkbox"
            checked={draft.latePenaltyToCharity ?? true}
            onChange={(event) => updateDraft({ latePenaltyToCharity: event.target.checked })}
          />
          <label htmlFor="late-penalty-charity" className="text-sm font-medium">Late penalty to charity</label>
        </div>
      </div>

      {(draft.profitCalculationMethod === 'EXPECTED_PROFIT_RATE' ||
        draft.profitCalculationMethod === 'RENTAL_RATE' ||
        draft.profitCalculationMethod === 'COMMISSION_BASED') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Fixed / Indicative Rate</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.fixedProfitRate ?? ''}
              onChange={(event) => updateDraft({ fixedProfitRate: numberOrUndefined(event.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Base Rate</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.baseRate ?? ''}
              onChange={(event) => updateDraft({ baseRate: numberOrUndefined(event.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Margin</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.margin ?? ''}
              onChange={(event) => updateDraft({ margin: numberOrUndefined(event.target.value) })}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {contractCode === 'MURABAHA' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg border border-border p-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Markup Rate (%)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.markupRate ?? ''}
              onChange={(event) => updateDraft({ markupRate: numberOrUndefined(event.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Grace Period Days</label>
            <input
              type="number"
              min={0}
              value={draft.gracePeriodDays ?? ''}
              onChange={(event) => updateDraft({ gracePeriodDays: numberOrUndefined(event.target.value) })}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 mt-7">
            <input
              id="murabaha-cost-price"
              type="checkbox"
              checked={draft.costPriceRequired ?? true}
              onChange={(event) => updateDraft({ costPriceRequired: event.target.checked })}
            />
            <label htmlFor="murabaha-cost-price" className="text-sm font-medium">Cost price disclosed</label>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 mt-7">
            <input
              id="murabaha-immutable-price"
              type="checkbox"
              checked={draft.sellingPriceImmutable ?? true}
              onChange={(event) => updateDraft({ sellingPriceImmutable: event.target.checked })}
            />
            <label htmlFor="murabaha-immutable-price" className="text-sm font-medium">Selling price immutable</label>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium mb-1.5">Charity GL Account</label>
            <input
              type="text"
              value={draft.charityGlAccountCode ?? ''}
              onChange={(event) => updateDraft({ charityGlAccountCode: event.target.value })}
              placeholder="GL-CHARITY-001"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {contractCode === 'IJARAH' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg border border-border p-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Asset Ownership</label>
            <select
              value={draft.assetOwnershipDuringTenor ?? ''}
              onChange={(event) => updateDraft({ assetOwnershipDuringTenor: event.target.value as IslamicProductDraft['assetOwnershipDuringTenor'] })}
              className={selectCls}
            >
              <option value="">Select ownership</option>
              <option value="BANK_OWNED">Bank owned</option>
              <option value="CUSTOMER_OWNED">Customer owned</option>
              <option value="JOINT">Joint</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Maintenance Responsibility</label>
            <select
              value={draft.maintenanceResponsibility ?? ''}
              onChange={(event) => updateDraft({ maintenanceResponsibility: event.target.value as IslamicProductDraft['maintenanceResponsibility'] })}
              className={selectCls}
            >
              <option value="">Select responsibility</option>
              <option value="BANK">Bank</option>
              <option value="CUSTOMER">Customer</option>
              <option value="SHARED">Shared</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Insurance Responsibility</label>
            <select
              value={draft.insuranceResponsibility ?? ''}
              onChange={(event) => updateDraft({ insuranceResponsibility: event.target.value as IslamicProductDraft['insuranceResponsibility'] })}
              className={selectCls}
            >
              <option value="">Select responsibility</option>
              <option value="BANK">Bank</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 mt-7">
            <input
              id="asset-transfer-on-completion"
              type="checkbox"
              checked={draft.assetTransferOnCompletion ?? false}
              onChange={(event) => updateDraft({ assetTransferOnCompletion: event.target.checked })}
            />
            <label htmlFor="asset-transfer-on-completion" className="text-sm font-medium">Transfer asset at completion</label>
          </div>
        </div>
      )}

      {(contractCode === 'MUDARABAH' || contractCode === 'MUSHARAKAH') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg border border-border p-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Bank Share (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={draft.bankSharePercentage ?? draft.profitSharingRatioBank ?? ''}
              onChange={(event) => updateDraft({
                bankSharePercentage: numberOrUndefined(event.target.value),
                profitSharingRatioBank: contractCode === 'MUDARABAH' ? numberOrUndefined(event.target.value) : draft.profitSharingRatioBank,
              })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Customer Share (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={draft.customerSharePercentage ?? draft.profitSharingRatioCustomer ?? ''}
              onChange={(event) => updateDraft({
                customerSharePercentage: numberOrUndefined(event.target.value),
                profitSharingRatioCustomer: contractCode === 'MUDARABAH' ? numberOrUndefined(event.target.value) : draft.profitSharingRatioCustomer,
              })}
              className={inputCls}
            />
          </div>
          {contractCode === 'MUDARABAH' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Loss Sharing Method</label>
              <select
                value={draft.lossSharingMethod ?? ''}
                onChange={(event) => updateDraft({ lossSharingMethod: event.target.value as IslamicProductDraft['lossSharingMethod'] })}
                className={selectCls}
              >
                <option value="">Select method</option>
                <option value="PROPORTIONAL_TO_CAPITAL">Proportional to capital</option>
                <option value="BANK_ABSORBS_FIRST">Bank absorbs first</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          )}
          {contractCode === 'MUSHARAKAH' && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 mt-7">
                <input
                  id="diminishing-schedule"
                  type="checkbox"
                  checked={draft.diminishingSchedule ?? false}
                  onChange={(event) => updateDraft({ diminishingSchedule: event.target.checked })}
                />
                <label htmlFor="diminishing-schedule" className="text-sm font-medium">Diminishing schedule</label>
              </div>
              {(draft.diminishingSchedule ?? false) && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Diminishing Frequency</label>
                    <select
                      value={draft.diminishingFrequency ?? ''}
                      onChange={(event) => updateDraft({ diminishingFrequency: event.target.value as IslamicProductDraft['diminishingFrequency'] })}
                      className={selectCls}
                    >
                      <option value="">Select frequency</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUALLY">Annually</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ownership Units</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.diminishingUnitsTotal ?? ''}
                      onChange={(event) => updateDraft({ diminishingUnitsTotal: numberOrUndefined(event.target.value) })}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Currencies</label>
          <input
            type="text"
            value={toCommaSeparated(draft.currencies)}
            onChange={(event) => updateDraft({ currencies: fromCommaSeparated(event.target.value) })}
            placeholder="NGN, USD"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Eligible Customer Types</label>
          <input
            type="text"
            value={toCommaSeparated(draft.eligibleCustomerTypes)}
            onChange={(event) => updateDraft({ eligibleCustomerTypes: fromCommaSeparated(event.target.value) })}
            placeholder="INDIVIDUAL, CORPORATE"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Eligible Segments</label>
          <input
            type="text"
            value={toCommaSeparated(draft.eligibleSegments)}
            onChange={(event) => updateDraft({ eligibleSegments: fromCommaSeparated(event.target.value) })}
            placeholder="PREMIUM, SME"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Eligible Countries</label>
          <input
            type="text"
            value={toCommaSeparated(draft.eligibleCountries)}
            onChange={(event) => updateDraft({ eligibleCountries: fromCommaSeparated(event.target.value) })}
            placeholder="NG, AE, GB"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Shariah Rule Group</label>
          <input
            type="text"
            value={draft.shariahRuleGroupCode ?? ''}
            onChange={(event) => updateDraft({ shariahRuleGroupCode: event.target.value.toUpperCase() })}
            placeholder="MURABAHA"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Decision Table Code</label>
          <input
            type="text"
            value={draft.profitRateDecisionTableCode ?? ''}
            onChange={(event) => updateDraft({ profitRateDecisionTableCode: event.target.value.toUpperCase() })}
            placeholder="MRB_PROFIT_TABLE"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">AAOIFI Standard</label>
          <input
            type="text"
            value={draft.aaoifiStandard ?? ''}
            onChange={(event) => updateDraft({ aaoifiStandard: event.target.value })}
            placeholder="FAS 28"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Financing Asset GL</label>
          <input
            type="text"
            value={draft.financingAssetGl ?? ''}
            onChange={(event) => updateDraft({ financingAssetGl: event.target.value })}
            placeholder="GL-FIN-001"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Profit Receivable GL</label>
          <input
            type="text"
            value={draft.profitReceivableGl ?? ''}
            onChange={(event) => updateDraft({ profitReceivableGl: event.target.value })}
            placeholder="GL-PROFIT-REC"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Profit Income GL</label>
          <input
            type="text"
            value={draft.profitIncomeGl ?? ''}
            onChange={(event) => updateDraft({ profitIncomeGl: event.target.value })}
            placeholder="GL-PROFIT-INC"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Deposit Liability GL</label>
          <input
            type="text"
            value={draft.depositLiabilityGl ?? ''}
            onChange={(event) => updateDraft({ depositLiabilityGl: event.target.value })}
            placeholder="GL-DEP-LIAB"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Profit Payable GL</label>
          <input
            type="text"
            value={draft.profitPayableGl ?? ''}
            onChange={(event) => updateDraft({ profitPayableGl: event.target.value })}
            placeholder="GL-PROFIT-PAY"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Charity GL</label>
          <input
            type="text"
            value={draft.charityGl ?? ''}
            onChange={(event) => updateDraft({ charityGl: event.target.value })}
            placeholder="GL-CHARITY-001"
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
        <div className="font-medium">Profit display preview</div>
        <div className="mt-1 text-muted-foreground">{formatIslamicProfitDisplay(draft)}</div>
        {selectedContractType?.keyShariahPrinciples?.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {selectedContractType.keyShariahPrinciples.slice(0, 4).map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}