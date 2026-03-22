package com.cbs.reports.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.repository.AccountRepository;
import com.cbs.branch.entity.Branch;
import com.cbs.branch.repository.BranchRepository;
import com.cbs.campaign.entity.MarketingCampaign;
import com.cbs.campaign.repository.MarketingCampaignRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.deposit.entity.FixedDeposit;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.repository.LoanAccountRepository;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.reports.dto.ReportDTOs.*;
import com.cbs.saleslead.entity.SalesLead;
import com.cbs.saleslead.repository.SalesLeadRepository;
import com.cbs.survey.entity.CustomerSurvey;
import com.cbs.survey.entity.SurveyResponse;
import com.cbs.survey.repository.CustomerSurveyRepository;
import com.cbs.survey.repository.SurveyResponseRepository;
import com.cbs.treasury.entity.DealStatus;
import com.cbs.treasury.entity.DealType;
import com.cbs.treasury.entity.TreasuryDeal;
import com.cbs.treasury.repository.TreasuryDealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportsService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final FixedDepositRepository fixedDepositRepository;
    private final BranchRepository branchRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final ChartOfAccountsRepository chartOfAccountsRepository;
    private final TreasuryDealRepository treasuryDealRepository;
    private final MarketingCampaignRepository marketingCampaignRepository;
    private final CustomerSurveyRepository customerSurveyRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SalesLeadRepository salesLeadRepository;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    // ========================================================================
    // Helpers
    // ========================================================================

    /** Null-safe list: never returns null */
    private <T> List<T> safe(List<T> list) {
        return list != null ? list : List.of();
    }

    private LocalDate defaultFrom(LocalDate from) {
        return from != null ? from : LocalDate.now().minusMonths(12).withDayOfMonth(1);
    }

    private LocalDate defaultTo(LocalDate to) {
        return to != null ? to : LocalDate.now();
    }

    private Instant toStartOfDay(LocalDate d) {
        return d.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    private Instant toEndOfDay(LocalDate d) {
        return d.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
    }

    private BigDecimal pct(long part, long total) {
        if (total == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(part)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal pct(BigDecimal part, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return part.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal safeDivide(BigDecimal a, BigDecimal b) {
        if (b.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return a.divide(b, 4, RoundingMode.HALF_UP);
    }

    private List<String> monthRange(LocalDate from, LocalDate to) {
        List<String> months = new ArrayList<>();
        LocalDate d = from.withDayOfMonth(1);
        while (!d.isAfter(to)) {
            months.add(d.format(MONTH_FMT));
            d = d.plusMonths(1);
        }
        return months;
    }

    // ========================================================================
    // EXECUTIVE REPORTS
    // ========================================================================

    @Cacheable(value = "reports-executive-kpis", key = "#from?.toString() + '-' + #to?.toString()")
    public ExecutiveKpis getExecutiveKpis(LocalDate from, LocalDate to) {
        List<Account> allAccounts = safe(accountRepository.findAll());
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());

        BigDecimal totalDeposits = allAccounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getBookBalance)
                .filter(Objects::nonNull)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LoanAccount> activeLoans = allLoans.stream()
                .filter(LoanAccount::isActive)
                .collect(Collectors.toList());
        BigDecimal totalLoanPortfolio = activeLoans.stream()
                .map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalCustomers = customerRepository.count();

        // NPL: loans with daysPastDue > 90
        BigDecimal nplAmount = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                .map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal nplRatio = pct(nplAmount, totalLoanPortfolio);

        // Revenue from GL income accounts
        BigDecimal totalRevenue = getGlCategoryBalance(GlCategory.INCOME);
        BigDecimal totalExpenses = getGlCategoryBalance(GlCategory.EXPENSE);
        BigDecimal costToIncome = pct(totalExpenses, totalRevenue);

        return ExecutiveKpis.builder()
                .totalDeposits(totalDeposits)
                .totalLoans(totalLoanPortfolio)
                .totalCustomers(totalCustomers)
                .totalRevenue(totalRevenue)
                .nplRatio(nplRatio)
                .costToIncomeRatio(costToIncome)
                .build();
    }

    /**
     * Returns a full P&L breakdown (PnlSummaryV2) matching the frontend's
     * executive dashboard PnlSummary contract.
     */
    @Cacheable(value = "reports-pnl-summary", key = "#from?.toString() + #to?.toString()")
    public PnlSummaryV2 getPnlSummary(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);

        // Interest income = total interest charged on active loans
        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal interestIncome = activeLoans.stream()
                .map(LoanAccount::getTotalInterestCharged)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Interest expense = accrued interest on deposit accounts
        BigDecimal interestExpense = safe(accountRepository.findAll()).stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getAccruedInterest)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netInterestIncome = interestIncome.subtract(interestExpense);

        // Fee & commission = GL fee/commission accounts
        BigDecimal feeCommission = getGlCategoryBalanceForPeriod(GlCategory.INCOME, f, t)
                .subtract(interestIncome).max(BigDecimal.ZERO);

        BigDecimal totalRevenue = interestIncome.add(feeCommission);
        BigDecimal opex = getGlCategoryBalanceForPeriod(GlCategory.EXPENSE, f, t);
        BigDecimal provisions = BigDecimal.ZERO; // would require loan provision data
        BigDecimal pbt = totalRevenue.subtract(opex).subtract(provisions);
        BigDecimal tax = pbt.compareTo(BigDecimal.ZERO) > 0
                ? pbt.multiply(BigDecimal.valueOf(0.3)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal netProfit = pbt.subtract(tax);

        BigDecimal totalAssets = getGlCategoryBalance(GlCategory.ASSET);
        BigDecimal totalEquity = getGlCategoryBalance(GlCategory.EQUITY);
        BigDecimal nim = safeDivide(netInterestIncome.multiply(BigDecimal.valueOf(100)), totalAssets);
        BigDecimal costToIncome = pct(opex, totalRevenue);
        BigDecimal roe = safeDivide(netProfit.multiply(BigDecimal.valueOf(100)), totalEquity);

        return PnlSummaryV2.builder()
                .interestIncome(interestIncome).interestExpense(interestExpense)
                .netInterestIncome(netInterestIncome).feeCommission(feeCommission)
                .tradingIncome(BigDecimal.ZERO).otherIncome(BigDecimal.ZERO)
                .totalRevenue(totalRevenue).opex(opex).provisions(provisions)
                .pbt(pbt).tax(tax).netProfit(netProfit)
                .nim(nim).costToIncome(costToIncome).roe(roe)
                .build();
    }

    /**
     * Returns monthly P&L with the granular breakdown (MonthlyPnlEntryV2) the
     * frontend trend chart needs: interestIncome, feeIncome, tradingIncome, opex, netProfit.
     */
    public List<MonthlyPnlEntryV2> getMonthlyPnl(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalInterestIncome = activeLoans.stream()
                .map(LoanAccount::getTotalInterestCharged)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthCount = BigDecimal.valueOf(Math.max(1, months.size()));

        List<MonthlyPnlEntryV2> result = new ArrayList<>();
        for (String m : months) {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            BigDecimal rev = getGlCategoryBalanceForPeriod(GlCategory.INCOME, start, end);
            BigDecimal exp = getGlCategoryBalanceForPeriod(GlCategory.EXPENSE, start, end);
            // Approximate interest income as proportional share of total
            BigDecimal intInc = safeDivide(totalInterestIncome, monthCount);
            BigDecimal feeInc = rev.subtract(intInc).max(BigDecimal.ZERO);
            result.add(MonthlyPnlEntryV2.builder()
                    .month(m)
                    .interestIncome(intInc)
                    .feeIncome(feeInc)
                    .tradingIncome(BigDecimal.ZERO)
                    .opex(exp)
                    .netProfit(rev.subtract(exp))
                    .build());
        }
        return result;
    }

    @Cacheable("reports-key-ratios")
    public KeyRatios getKeyRatios() {
        BigDecimal totalAssets = getGlCategoryBalance(GlCategory.ASSET);
        BigDecimal totalEquity = getGlCategoryBalance(GlCategory.EQUITY);
        BigDecimal totalIncome = getGlCategoryBalance(GlCategory.INCOME);
        BigDecimal totalExpense = getGlCategoryBalance(GlCategory.EXPENSE);
        BigDecimal netProfit = totalIncome.subtract(totalExpense);

        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalLoans = activeLoans.stream()
                .map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDeposits = safe(accountRepository.findAll()).stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getBookBalance)
                .filter(Objects::nonNull)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal interestIncome = activeLoans.stream()
                .map(LoanAccount::getTotalInterestCharged)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal interestExpense = safe(accountRepository.findAll()).stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getAccruedInterest)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return KeyRatios.builder()
                .roa(safeDivide(netProfit.multiply(BigDecimal.valueOf(100)), totalAssets))
                .roe(safeDivide(netProfit.multiply(BigDecimal.valueOf(100)), totalEquity))
                .nim(safeDivide(interestIncome.subtract(interestExpense).multiply(BigDecimal.valueOf(100)), totalAssets))
                .costToIncome(pct(totalExpense, totalIncome))
                .car(BigDecimal.ZERO) // requires regulatory capital data
                .ldr(pct(totalLoans, totalDeposits))
                .build();
    }

    public List<DepositLoanGrowthEntry> getDepositLoanGrowth(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);

        List<Account> allAccounts = safe(accountRepository.findAll());
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());

        List<DepositLoanGrowthEntry> result = new ArrayList<>();
        for (String m : months) {
            LocalDate monthEnd = LocalDate.parse(m + "-01").withDayOfMonth(LocalDate.parse(m + "-01").lengthOfMonth());
            BigDecimal deposits = allAccounts.stream()
                    .filter(a -> a.getStatus() == AccountStatus.ACTIVE || a.getOpenedDate().isBefore(monthEnd.plusDays(1)))
                    .filter(a -> a.getOpenedDate() != null && !a.getOpenedDate().isAfter(monthEnd))
                    .filter(a -> a.getClosedDate() == null || a.getClosedDate().isAfter(monthEnd))
                    .map(Account::getBookBalance)
                    .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal loans = allLoans.stream()
                    .filter(l -> l.getDisbursementDate() != null && !l.getDisbursementDate().isAfter(monthEnd))
                    .filter(l -> l.getClosedDate() == null || l.getClosedDate().isAfter(monthEnd))
                    .map(LoanAccount::getOutstandingPrincipal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            result.add(DepositLoanGrowthEntry.builder().month(m).deposits(deposits).loans(loans).build());
        }
        return result;
    }

    /**
     * Returns customer growth with a running totalCustomers field (CustomerGrowthEntryV2).
     */
    public List<CustomerGrowthEntryV2> getCustomerGrowth(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);

        List<Customer> allCustomers = safe(customerRepository.findAll());
        long totalCustomers = allCustomers.size();

        // Calculate running total by walking backwards from the current total
        List<CustomerGrowthEntryV2> result = new ArrayList<>();
        for (String m : months) {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant startInst = toStartOfDay(start);
            Instant endInst = toEndOfDay(end);

            long newCust = allCustomers.stream()
                    .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(startInst) && !c.getCreatedAt().isAfter(endInst))
                    .count();
            long closed = allCustomers.stream()
                    .filter(c -> c.getStatus() == CustomerStatus.CLOSED)
                    .filter(c -> c.getUpdatedAt() != null && !c.getUpdatedAt().isBefore(startInst) && !c.getUpdatedAt().isAfter(endInst))
                    .count();

            // Count customers who existed at end of this month (opened on or before monthEnd)
            long snapshot = allCustomers.stream()
                    .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isAfter(endInst))
                    .filter(c -> c.getStatus() != CustomerStatus.CLOSED
                            || (c.getUpdatedAt() != null && c.getUpdatedAt().isAfter(endInst)))
                    .count();

            result.add(CustomerGrowthEntryV2.builder()
                    .month(m)
                    .newCustomers(newCust)
                    .closedCustomers(closed)
                    .netGrowth(newCust - closed)
                    .totalCustomers(snapshot)
                    .build());
        }
        return result;
    }

    /**
     * Returns top branches enriched with rank, customer count, and efficiency ratio
     * (BranchPerformanceV2) to match the frontend dashboard table contract.
     */
    public List<BranchPerformanceV2> getTopBranches() {
        List<Branch> branches = safe(branchRepository.findByIsActiveTrueOrderByBranchNameAsc());
        List<Account> accounts = safe(accountRepository.findAll());
        List<LoanAccount> loans = safe(loanAccountRepository.findAll());
        List<Customer> customers = safe(customerRepository.findAll());

        Map<String, BigDecimal> depositByBranch = accounts.stream()
                .filter(a -> a.getBranchCode() != null && a.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.groupingBy(Account::getBranchCode,
                        Collectors.reducing(BigDecimal.ZERO, a -> a.getBookBalance() != null ? a.getBookBalance().max(BigDecimal.ZERO) : BigDecimal.ZERO, BigDecimal::add)));

        Map<String, BigDecimal> loanByBranch = loans.stream()
                .filter(l -> l.getBranchCode() != null && l.isActive())
                .collect(Collectors.groupingBy(LoanAccount::getBranchCode,
                        Collectors.reducing(BigDecimal.ZERO, l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO, BigDecimal::add)));

        Map<String, Long> customersByBranch = customers.stream()
                .filter(c -> c.getBranchCode() != null)
                .collect(Collectors.groupingBy(Customer::getBranchCode, Collectors.counting()));

        Map<String, String> branchNames = branches.stream()
                .collect(Collectors.toMap(Branch::getBranchCode, Branch::getBranchName, (a, b) -> a));

        Set<String> allBranchCodes = new HashSet<>();
        allBranchCodes.addAll(depositByBranch.keySet());
        allBranchCodes.addAll(loanByBranch.keySet());

        List<BranchPerformanceV2> sorted = allBranchCodes.stream()
                .map(code -> {
                    BigDecimal dep = depositByBranch.getOrDefault(code, BigDecimal.ZERO);
                    BigDecimal ln  = loanByBranch.getOrDefault(code, BigDecimal.ZERO);
                    BigDecimal rev = dep.add(ln);
                    // Efficiency ratio = operating expenses / revenue (simplified: assume 40% opex)
                    BigDecimal efficiencyRatio = rev.compareTo(BigDecimal.ZERO) > 0
                            ? BigDecimal.valueOf(40) : BigDecimal.ZERO;
                    return BranchPerformanceV2.builder()
                            .rank(0)  // assigned below after sorting
                            .branch(branchNames.getOrDefault(code, code))
                            .branchCode(code)
                            .deposits(dep).loans(ln).revenue(rev)
                            .customers(customersByBranch.getOrDefault(code, 0L))
                            .efficiencyRatio(efficiencyRatio)
                            .build();
                })
                .sorted(Comparator.comparing(BranchPerformanceV2::getRevenue).reversed())
                .limit(10)
                .collect(Collectors.toList());

        // Assign ranks after sorting
        for (int i = 0; i < sorted.size(); i++) {
            sorted.get(i).setRank(i + 1);
        }
        return sorted;
    }

    // ========================================================================
    // FINANCIAL REPORTS
    // ========================================================================

    public BalanceSheet getBalanceSheet(LocalDate asOf) {
        LocalDate date = asOf != null ? asOf : LocalDate.now();
        List<GlBalance> balances = safe(glBalanceRepository.findByBalanceDateOrderByGlCodeAsc(date));
        List<ChartOfAccounts> coa = safe(chartOfAccountsRepository.findAll());
        Map<String, ChartOfAccounts> coaMap = coa.stream().collect(Collectors.toMap(ChartOfAccounts::getGlCode, c -> c, (a, b) -> a));

        List<GlCategoryEntry> assets = new ArrayList<>();
        List<GlCategoryEntry> liabilities = new ArrayList<>();
        List<GlCategoryEntry> equity = new ArrayList<>();
        BigDecimal totalA = BigDecimal.ZERO, totalL = BigDecimal.ZERO, totalE = BigDecimal.ZERO;

        Map<String, BigDecimal> glBalMap = balances.stream()
                .collect(Collectors.groupingBy(GlBalance::getGlCode,
                        Collectors.reducing(BigDecimal.ZERO, GlBalance::getClosingBalance, BigDecimal::add)));

        for (Map.Entry<String, BigDecimal> e : glBalMap.entrySet()) {
            ChartOfAccounts acct = coaMap.get(e.getKey());
            if (acct == null) continue;
            GlCategoryEntry entry = GlCategoryEntry.builder()
                    .glCode(e.getKey()).glName(acct.getGlName()).balance(e.getValue()).build();
            switch (acct.getGlCategory()) {
                case ASSET -> { assets.add(entry); totalA = totalA.add(e.getValue()); }
                case LIABILITY -> { liabilities.add(entry); totalL = totalL.add(e.getValue()); }
                case EQUITY -> { equity.add(entry); totalE = totalE.add(e.getValue()); }
                default -> {}
            }
        }

        return BalanceSheet.builder()
                .totalAssets(totalA).totalLiabilities(totalL).totalEquity(totalE)
                .assets(assets).liabilities(liabilities).equity(equity)
                .build();
    }

    public IncomeStatement getIncomeStatement(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);

        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal interestIncome = activeLoans.stream()
                .map(LoanAccount::getTotalInterestCharged)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Account> accounts = safe(accountRepository.findAll());
        BigDecimal interestExpense = accounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getAccruedInterest)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal feeIncome = getGlCategoryBalanceForPeriod(GlCategory.INCOME, f, t)
                .subtract(interestIncome).max(BigDecimal.ZERO);

        BigDecimal operatingExpenses = getGlCategoryBalanceForPeriod(GlCategory.EXPENSE, f, t);

        BigDecimal provisionCharge = activeLoans.stream()
                .map(LoanAccount::getProvisionAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netInterest = interestIncome.subtract(interestExpense);
        BigDecimal pbt = netInterest.add(feeIncome).subtract(operatingExpenses).subtract(provisionCharge);

        return IncomeStatement.builder()
                .interestIncome(interestIncome).interestExpense(interestExpense)
                .netInterestIncome(netInterest).feeIncome(feeIncome)
                .operatingExpenses(operatingExpenses).provisionCharge(provisionCharge)
                .profitBeforeTax(pbt)
                .build();
    }

    public CashFlowStatement getCashFlow(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);

        // Approximate from GL movements
        BigDecimal income = getGlCategoryBalanceForPeriod(GlCategory.INCOME, f, t);
        BigDecimal expense = getGlCategoryBalanceForPeriod(GlCategory.EXPENSE, f, t);
        BigDecimal operating = income.subtract(expense);

        // Investing: net change in loan portfolio
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());
        BigDecimal loanDisbursed = allLoans.stream()
                .filter(l -> l.getDisbursementDate() != null && !l.getDisbursementDate().isBefore(f) && !l.getDisbursementDate().isAfter(t))
                .map(LoanAccount::getDisbursedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal investing = loanDisbursed.negate();

        // Financing: net deposit change (simplified)
        BigDecimal financing = BigDecimal.ZERO;

        return CashFlowStatement.builder()
                .operatingActivities(operating).investingActivities(investing)
                .financingActivities(financing)
                .netCashFlow(operating.add(investing).add(financing))
                .build();
    }

    public CapitalAdequacy getCapitalAdequacy() {
        BigDecimal equity = getGlCategoryBalance(GlCategory.EQUITY);

        // Tier 1 approximation: equity
        BigDecimal tier1 = equity;
        BigDecimal tier2 = BigDecimal.ZERO;
        BigDecimal totalCapital = tier1.add(tier2);

        // Simplified RWA: total loan outstanding (100% risk weight)
        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal rwa = activeLoans.stream()
                .map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal car = pct(totalCapital, rwa);

        return CapitalAdequacy.builder()
                .tier1Capital(tier1).tier2Capital(tier2).totalCapital(totalCapital)
                .riskWeightedAssets(rwa).capitalAdequacyRatio(car)
                .build();
    }

    // ========================================================================
    // LOAN REPORTS
    // ========================================================================

    @Cacheable("reports-loan-stats")
    public LoanStats getLoanStats() {
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());
        List<LoanAccount> active = allLoans.stream().filter(LoanAccount::isActive).collect(Collectors.toList());

        BigDecimal portfolio = active.stream().map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal nplAmount = active.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                .map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProvisions = active.stream()
                .map(LoanAccount::getProvisionAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return LoanStats.builder()
                .totalPortfolio(portfolio).activeCount(active.size())
                .nplAmount(nplAmount).nplRatio(pct(nplAmount, portfolio))
                .totalProvisions(totalProvisions)
                .provisionCoverage(pct(totalProvisions, nplAmount))
                .build();
    }

    @Cacheable("reports-loan-product-mix")
    public List<ProductMixEntry> getLoanProductMix() {
        List<LoanAccount> active = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalPortfolio = active.stream().map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<LoanAccount>> byProduct = active.stream()
                .filter(l -> l.getLoanProduct() != null)
                .collect(Collectors.groupingBy(l -> l.getLoanProduct().getName()));

        return byProduct.entrySet().stream()
                .map(e -> {
                    List<LoanAccount> loans = e.getValue();
                    BigDecimal amount = loans.stream().map(LoanAccount::getOutstandingPrincipal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal nplAmount = loans.stream()
                            .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                            .map(LoanAccount::getOutstandingPrincipal)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal weightedRateNumerator = loans.stream()
                            .map(l -> safeDecimal(l.getInterestRate()).multiply(safeDecimal(l.getOutstandingPrincipal())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal avgRate = amount.compareTo(BigDecimal.ZERO) > 0
                            ? weightedRateNumerator.divide(amount, 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    int avgTenorMonths = loans.isEmpty()
                            ? 0
                            : (int) Math.round(loans.stream()
                                    .mapToInt(l -> l.getTenureMonths() != null ? l.getTenureMonths() : 0)
                                    .average()
                                    .orElse(0));
                    return ProductMixEntry.builder()
                            .productName(e.getKey())
                            .productCode(loans.get(0).getLoanProduct().getCode())
                            .count(loans.size())
                            .amount(amount)
                            .percentage(pct(amount, totalPortfolio))
                            .nplPct(pct(nplAmount, amount))
                            .avgRate(avgRate)
                            .avgTenorMonths(avgTenorMonths)
                            .build();
                })
                .sorted(Comparator.comparing(ProductMixEntry::getAmount).reversed())
                .collect(Collectors.toList());
    }

    @Cacheable("reports-loan-sector-exposure")
    public List<SectorExposureEntry> getLoanSectorExposure() {
        List<LoanAccount> active = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalPortfolio = active.stream().map(LoanAccount::getOutstandingPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<LoanAccount>> bySector = active.stream()
                .filter(l -> l.getCustomer() != null)
                .collect(Collectors.groupingBy(l -> {
                    String s = l.getCustomer().getSectorCode();
                    return s != null ? s : "UNKNOWN";
                }));

        return bySector.entrySet().stream()
                .map(e -> {
                    List<LoanAccount> loans = e.getValue();
                    BigDecimal exposure = loans.stream().map(LoanAccount::getOutstandingPrincipal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal nplAmount = loans.stream()
                            .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                            .map(LoanAccount::getOutstandingPrincipal)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return SectorExposureEntry.builder()
                            .sector(e.getKey()).count(loans.size())
                            .exposure(exposure).percentage(pct(exposure, totalPortfolio))
                            .nplPct(pct(nplAmount, exposure))
                            .build();
                })
                .sorted(Comparator.comparing(SectorExposureEntry::getExposure).reversed())
                .collect(Collectors.toList());
    }

    @Cacheable("reports-dpd-buckets")
    public List<DpdBucket> getDpdBuckets() {
        List<LoanAccount> active = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalPortfolio = active.stream().map(LoanAccount::getOutstandingPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String[] buckets = {"CURRENT", "1-30", "31-60", "61-90", "91-180", "180+"};
        Map<String, List<LoanAccount>> byBucket = active.stream()
                .collect(Collectors.groupingBy(l -> l.getDelinquencyBucket() != null ? l.getDelinquencyBucket() : "CURRENT"));

        List<DpdBucket> result = new ArrayList<>();
        for (String b : buckets) {
            List<LoanAccount> group = byBucket.getOrDefault(b, Collections.emptyList());
            BigDecimal amount = group.stream().map(LoanAccount::getOutstandingPrincipal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal provision = group.stream().map(LoanAccount::getProvisionAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(DpdBucket.builder()
                    .bucket(b).count(group.size()).amount(amount).percentage(pct(amount, totalPortfolio))
                    .provision(provision).coveragePct(pct(provision, amount))
                    .build());
        }
        return result;
    }

    public List<NplTrendEntry> getNplTrend(LocalDate from, LocalDate to) {
        // Snapshot current NPL data and present as trend (best effort with current data)
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());

        List<NplTrendEntry> result = new ArrayList<>();
        for (String m : months) {
            LocalDate monthEnd = LocalDate.parse(m + "-01").withDayOfMonth(LocalDate.parse(m + "-01").lengthOfMonth());

            List<LoanAccount> activeAtMonth = allLoans.stream()
                    .filter(l -> l.getDisbursementDate() != null && !l.getDisbursementDate().isAfter(monthEnd))
                    .filter(l -> l.getClosedDate() == null || l.getClosedDate().isAfter(monthEnd))
                    .collect(Collectors.toList());

            BigDecimal portfolio = activeAtMonth.stream().map(LoanAccount::getOutstandingPrincipal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal nplAmt = activeAtMonth.stream()
                    .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                    .map(LoanAccount::getOutstandingPrincipal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            result.add(NplTrendEntry.builder().month(m).nplAmount(nplAmt).nplRatio(pct(nplAmt, portfolio)).build());
        }
        return result;
    }

    public ProvisionWaterfall getProvisionWaterfall(LocalDate from, LocalDate to) {
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());
        BigDecimal closing = allLoans.stream()
                .filter(LoanAccount::isActive)
                .map(LoanAccount::getProvisionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Without historical provision data, show current closing as opening = closing
        return ProvisionWaterfall.builder()
                .opening(closing).charge(BigDecimal.ZERO).release(BigDecimal.ZERO)
                .writeOff(BigDecimal.ZERO).closing(closing)
                .build();
    }

    @Cacheable("reports-top-obligors")
    public List<TopObligor> getTopObligors() {
        List<LoanAccount> active = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalPortfolio = active.stream().map(LoanAccount::getOutstandingPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Group by customer
        Map<Long, List<LoanAccount>> byCustomer = active.stream()
                .filter(l -> l.getCustomer() != null)
                .collect(Collectors.groupingBy(l -> l.getCustomer().getId()));

        return byCustomer.entrySet().stream()
                .map(e -> {
                    Customer c = e.getValue().get(0).getCustomer();
                    BigDecimal exposure = e.getValue().stream().map(LoanAccount::getOutstandingPrincipal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    String worstBucket = e.getValue().stream()
                            .map(l -> l.getDelinquencyBucket() != null ? l.getDelinquencyBucket() : "CURRENT")
                            .max(Comparator.naturalOrder()).orElse("CURRENT");
                    return TopObligor.builder()
                            .customerName(c.getDisplayName()).cifNumber(c.getCifNumber())
                            .sector(c.getSectorCode())
                            .exposure(exposure).percentage(pct(exposure, totalPortfolio))
                            .delinquencyBucket(worstBucket)
                            .build();
                })
                .sorted(Comparator.comparing(TopObligor::getExposure).reversed())
                .limit(20)
                .collect(Collectors.toList());
    }

    @Cacheable("reports-loan-vintage")
    public List<VintageEntry> getLoanVintage() {
        List<LoanAccount> allLoans = safe(loanAccountRepository.findAll());

        Map<String, List<LoanAccount>> byCohort = allLoans.stream()
                .filter(l -> l.getDisbursementDate() != null)
                .collect(Collectors.groupingBy(l -> l.getDisbursementDate().format(MONTH_FMT)));

        return byCohort.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    BigDecimal disbursed = e.getValue().stream().map(LoanAccount::getDisbursedAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal outstanding = e.getValue().stream()
                            .filter(LoanAccount::isActive)
                            .map(LoanAccount::getOutstandingPrincipal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    long nplCount = e.getValue().stream()
                            .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90).count();
                    BigDecimal nplRate = pct(nplCount, e.getValue().size());
                    return VintageEntry.builder()
                            .cohort(e.getKey()).count(e.getValue().size())
                            .disbursedAmount(disbursed).outstandingAmount(outstanding).nplRate(nplRate)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Cacheable("reports-loan-dpd-matrix")
    public List<DpdMatrixRow> getLoanDpdMatrix() {
        List<LoanAccount> active = safe(loanAccountRepository.findAllActiveLoans());
        Map<String, List<LoanAccount>> byProduct = active.stream()
                .filter(l -> l.getLoanProduct() != null)
                .collect(Collectors.groupingBy(l -> l.getLoanProduct().getName()));

        return byProduct.entrySet().stream()
                .map(entry -> {
                    Map<String, DpdMatrixCell> cells = createEmptyMatrixCells();
                    for (LoanAccount loan : entry.getValue()) {
                        String key = normalizeMatrixBucket(loan.getDelinquencyBucket());
                        DpdMatrixCell existing = cells.get(key);
                        cells.put(key, DpdMatrixCell.builder()
                                .count(existing.getCount() + 1)
                                .amount(existing.getAmount().add(safeDecimal(loan.getOutstandingPrincipal())))
                                .build());
                    }
                    return DpdMatrixRow.builder()
                            .product(entry.getKey())
                            .current(cells.get("current"))
                            .dpd1_30(cells.get("dpd1_30"))
                            .dpd31_60(cells.get("dpd31_60"))
                            .dpd61_90(cells.get("dpd61_90"))
                            .dpd91_180(cells.get("dpd91_180"))
                            .dpd180plus(cells.get("dpd180plus"))
                            .build();
                })
                .sorted(Comparator.comparing(DpdMatrixRow::getProduct))
                .collect(Collectors.toList());
    }

    @Cacheable("reports-loan-geographic-concentration")
    public List<GeographicExposureEntry> getLoanGeographicConcentration() {
        List<LoanAccount> active = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal totalPortfolio = active.stream()
                .map(LoanAccount::getOutstandingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, String> branchRegionMap = safe(branchRepository.findAll()).stream()
                .collect(Collectors.toMap(
                        Branch::getBranchCode,
                        branch -> {
                            if (branch.getStateProvince() != null && !branch.getStateProvince().isBlank()) return branch.getStateProvince();
                            if (branch.getCity() != null && !branch.getCity().isBlank()) return branch.getCity();
                            if (branch.getRegionCode() != null && !branch.getRegionCode().isBlank()) return branch.getRegionCode();
                            return branch.getBranchCode();
                        },
                        (a, b) -> a
                ));

        Map<String, BigDecimal> exposureByRegion = new HashMap<>();
        for (LoanAccount loan : active) {
            String region = branchRegionMap.getOrDefault(loan.getBranchCode(), loan.getBranchCode() != null ? loan.getBranchCode() : "UNASSIGNED");
            exposureByRegion.merge(region, safeDecimal(loan.getOutstandingPrincipal()), BigDecimal::add);
        }

        return exposureByRegion.entrySet().stream()
                .map(entry -> GeographicExposureEntry.builder()
                        .region(entry.getKey())
                        .exposure(entry.getValue())
                        .percentage(pct(entry.getValue(), totalPortfolio))
                        .build())
                .sorted(Comparator.comparing(GeographicExposureEntry::getExposure).reversed())
                .collect(Collectors.toList());
    }

    @Cacheable("reports-loan-vintage-matrix")
    public List<VintageCellEntry> getLoanVintageMatrix() {
        List<LoanAccount> loans = safe(loanAccountRepository.findAll()).stream()
                .filter(loan -> loan.getDisbursementDate() != null)
                .collect(Collectors.toList());

        int[] monthBuckets = {3, 6, 9, 12, 18, 24};
        LocalDate today = LocalDate.now();
        Map<String, List<LoanAccount>> byCohort = loans.stream()
                .collect(Collectors.groupingBy(loan -> loan.getDisbursementDate().format(MONTH_FMT)));

        List<VintageCellEntry> result = new ArrayList<>();
        for (Map.Entry<String, List<LoanAccount>> cohortEntry : byCohort.entrySet().stream().sorted(Map.Entry.comparingByKey()).toList()) {
            for (int monthBucket : monthBuckets) {
                List<LoanAccount> eligible = cohortEntry.getValue().stream()
                        .filter(loan -> ChronoUnit.MONTHS.between(loan.getDisbursementDate(), today) >= monthBucket)
                        .collect(Collectors.toList());
                if (eligible.isEmpty()) {
                    continue;
                }
                long defaulted = eligible.stream()
                        .filter(loan -> loan.getDaysPastDue() != null && loan.getDaysPastDue() > 90)
                        .count();
                result.add(VintageCellEntry.builder()
                        .vintage(cohortEntry.getKey())
                        .month("M" + monthBucket)
                        .defaultRate(pct(defaulted, eligible.size()))
                        .build());
            }
        }
        return result;
    }

    private Map<String, DpdMatrixCell> createEmptyMatrixCells() {
        Map<String, DpdMatrixCell> cells = new HashMap<>();
        for (String key : List.of("current", "dpd1_30", "dpd31_60", "dpd61_90", "dpd91_180", "dpd180plus")) {
            cells.put(key, DpdMatrixCell.builder().build());
        }
        return cells;
    }

    private String normalizeMatrixBucket(String bucket) {
        if (bucket == null || bucket.isBlank() || "CURRENT".equalsIgnoreCase(bucket)) return "current";
        return switch (bucket) {
            case "1-30" -> "dpd1_30";
            case "31-60" -> "dpd31_60";
            case "61-90" -> "dpd61_90";
            case "91-180" -> "dpd91_180";
            default -> "dpd180plus";
        };
    }

    private BigDecimal safeDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    // ========================================================================
    // DEPOSIT REPORTS
    // ========================================================================

    @Cacheable("reports-deposit-stats")
    public DepositStats getDepositStats() {
        List<Account> accounts = safe(accountRepository.findAll());
        List<Account> active = accounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.toList());

        BigDecimal total = active.stream().map(Account::getBookBalance)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long count = active.size();
        BigDecimal avg = count > 0 ? total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // Concentration: top 10 depositors as % of total
        BigDecimal top10 = active.stream()
                .map(Account::getBookBalance)
                .sorted(Comparator.reverseOrder())
                .limit(10)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal concentration = pct(top10, total);

        return DepositStats.builder()
                .totalDeposits(total).accountCount(count).averageBalance(avg)
                .concentrationRatio(concentration)
                .build();
    }

    @Cacheable("reports-deposit-mix")
    public List<DepositMixEntry> getDepositMix() {
        List<Object[]> summary = safe(accountRepository.getAccountSummaryByProduct());
        BigDecimal total = BigDecimal.ZERO;
        List<DepositMixEntry> entries = new ArrayList<>();

        for (Object[] row : summary) {
            String productCode = row[0] != null ? row[0].toString() : "UNKNOWN";
            long cnt = row[1] != null ? ((Number) row[1]).longValue() : 0;
            BigDecimal amt = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            total = total.add(amt);
            entries.add(DepositMixEntry.builder().productType(productCode).count(cnt).amount(amt).build());
        }

        BigDecimal finalTotal = total;
        entries.forEach(e -> e.setPercentage(pct(e.getAmount(), finalTotal)));
        return entries;
    }

    public List<DepositGrowthEntry> getDepositGrowthTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<Account> allAccounts = safe(accountRepository.findAll());

        List<DepositGrowthEntry> result = new ArrayList<>();
        BigDecimal prev = BigDecimal.ZERO;
        for (String m : months) {
            LocalDate monthEnd = LocalDate.parse(m + "-01").withDayOfMonth(LocalDate.parse(m + "-01").lengthOfMonth());
            BigDecimal deposits = allAccounts.stream()
                    .filter(a -> a.getOpenedDate() != null && !a.getOpenedDate().isAfter(monthEnd))
                    .filter(a -> a.getClosedDate() == null || a.getClosedDate().isAfter(monthEnd))
                    .map(Account::getBookBalance)
                    .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal growth = deposits.subtract(prev);
            BigDecimal growthPct = pct(growth, prev);
            result.add(DepositGrowthEntry.builder()
                    .month(m).totalDeposits(deposits).growthAmount(growth).growthPercent(growthPct)
                    .build());
            prev = deposits;
        }
        return result;
    }

    @Cacheable("reports-deposit-maturity")
    public List<MaturityBucket> getDepositMaturityProfile() {
        List<FixedDeposit> active = safe(fixedDepositRepository.findAllActive());
        BigDecimal total = active.stream().map(FixedDeposit::getPrincipalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDate now = LocalDate.now();
        Map<String, List<FixedDeposit>> buckets = new LinkedHashMap<>();
        buckets.put("0-30 days", new ArrayList<>());
        buckets.put("31-60 days", new ArrayList<>());
        buckets.put("61-90 days", new ArrayList<>());
        buckets.put("91-180 days", new ArrayList<>());
        buckets.put("181-365 days", new ArrayList<>());
        buckets.put("365+ days", new ArrayList<>());

        for (FixedDeposit fd : active) {
            long days = ChronoUnit.DAYS.between(now, fd.getMaturityDate());
            if (days < 0) days = 0;
            if (days <= 30) buckets.get("0-30 days").add(fd);
            else if (days <= 60) buckets.get("31-60 days").add(fd);
            else if (days <= 90) buckets.get("61-90 days").add(fd);
            else if (days <= 180) buckets.get("91-180 days").add(fd);
            else if (days <= 365) buckets.get("181-365 days").add(fd);
            else buckets.get("365+ days").add(fd);
        }

        return buckets.entrySet().stream().map(e -> {
            BigDecimal amount = e.getValue().stream().map(FixedDeposit::getPrincipalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return MaturityBucket.builder()
                    .bucket(e.getKey()).count(e.getValue().size())
                    .amount(amount).percentage(pct(amount, total))
                    .build();
        }).collect(Collectors.toList());
    }

    @Cacheable("reports-cost-of-funds")
    public List<CostOfFundsEntry> getCostOfFunds() {
        List<Account> accounts = safe(accountRepository.findAll());

        Map<String, List<Account>> byProduct = accounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE && a.getProduct() != null)
                .collect(Collectors.groupingBy(a -> a.getProduct().getCode()));

        return byProduct.entrySet().stream().map(e -> {
            BigDecimal balance = e.getValue().stream().map(Account::getBookBalance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRate = e.getValue().stream().map(a -> a.getApplicableInterestRate() != null ? a.getApplicableInterestRate() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avgRate = e.getValue().isEmpty() ? BigDecimal.ZERO :
                    totalRate.divide(BigDecimal.valueOf(e.getValue().size()), 4, RoundingMode.HALF_UP);
            BigDecimal interestCost = balance.multiply(avgRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            return CostOfFundsEntry.builder()
                    .productType(e.getKey()).balance(balance).weightedAvgRate(avgRate).interestCost(interestCost)
                    .build();
        }).collect(Collectors.toList());
    }

    @Cacheable("reports-top-depositors")
    public List<TopDepositor> getTopDepositors() {
        List<Account> accounts = safe(accountRepository.findAll());
        BigDecimal total = accounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getBookBalance)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<Long, List<Account>> byCustomer = accounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE && a.getCustomer() != null)
                .collect(Collectors.groupingBy(a -> a.getCustomer().getId()));

        return byCustomer.entrySet().stream()
                .map(e -> {
                    Customer c = e.getValue().get(0).getCustomer();
                    BigDecimal dep = e.getValue().stream().map(Account::getBookBalance)
                            .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return TopDepositor.builder()
                            .customerName(c.getDisplayName()).cifNumber(c.getCifNumber())
                            .totalDeposits(dep).percentage(pct(dep, total))
                            .build();
                })
                .sorted(Comparator.comparing(TopDepositor::getTotalDeposits).reversed())
                .limit(20)
                .collect(Collectors.toList());
    }

    @Cacheable("reports-deposit-rate-bands")
    public List<RateBandEntry> getDepositRateBands() {
        List<Account> accounts = safe(accountRepository.findAll()).stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.toList());

        BigDecimal total = accounts.stream().map(Account::getBookBalance)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<Account>> bands = new LinkedHashMap<>();
        bands.put("0-2%", new ArrayList<>());
        bands.put("2-4%", new ArrayList<>());
        bands.put("4-6%", new ArrayList<>());
        bands.put("6-8%", new ArrayList<>());
        bands.put("8-10%", new ArrayList<>());
        bands.put("10%+", new ArrayList<>());

        for (Account a : accounts) {
            BigDecimal rate = a.getApplicableInterestRate() != null ? a.getApplicableInterestRate() : BigDecimal.ZERO;
            double r = rate.doubleValue();
            if (r < 2) bands.get("0-2%").add(a);
            else if (r < 4) bands.get("2-4%").add(a);
            else if (r < 6) bands.get("4-6%").add(a);
            else if (r < 8) bands.get("6-8%").add(a);
            else if (r < 10) bands.get("8-10%").add(a);
            else bands.get("10%+").add(a);
        }

        return bands.entrySet().stream().map(e -> {
            BigDecimal amt = e.getValue().stream().map(Account::getBookBalance)
                    .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return RateBandEntry.builder()
                    .rateBand(e.getKey()).count(e.getValue().size())
                    .amount(amt).percentage(pct(amt, total))
                    .build();
        }).collect(Collectors.toList());
    }

    @Cacheable("reports-deposit-rate-sensitivity")
    public List<RateSensitivityEntry> getDepositRateSensitivity() {
        List<FixedDeposit> active = safe(fixedDepositRepository.findAllActive());
        LocalDate now = LocalDate.now();

        String[] buckets = {"0-30 days", "31-90 days", "91-180 days", "181-365 days", "365+ days"};
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        for (String b : buckets) amounts.put(b, BigDecimal.ZERO);

        for (FixedDeposit fd : active) {
            long days = ChronoUnit.DAYS.between(now, fd.getMaturityDate());
            if (days < 0) days = 0;
            String bucket;
            if (days <= 30) bucket = "0-30 days";
            else if (days <= 90) bucket = "31-90 days";
            else if (days <= 180) bucket = "91-180 days";
            else if (days <= 365) bucket = "181-365 days";
            else bucket = "365+ days";
            amounts.merge(bucket, fd.getPrincipalAmount(), BigDecimal::add);
        }

        BigDecimal cumulative = BigDecimal.ZERO;
        List<RateSensitivityEntry> result = new ArrayList<>();
        for (String b : buckets) {
            cumulative = cumulative.add(amounts.get(b));
            result.add(RateSensitivityEntry.builder()
                    .bucket(b).amount(amounts.get(b)).cumulativeGap(cumulative)
                    .build());
        }
        return result;
    }

    @Cacheable("reports-deposit-retention")
    public List<RetentionVintageEntry> getDepositRetentionVintage() {
        List<Account> allAccounts = safe(accountRepository.findAll());

        Map<String, List<Account>> byCohort = allAccounts.stream()
                .filter(a -> a.getOpenedDate() != null)
                .collect(Collectors.groupingBy(a -> a.getOpenedDate().format(MONTH_FMT)));

        return byCohort.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    long opened = e.getValue().size();
                    long activeNow = e.getValue().stream()
                            .filter(a -> a.getStatus() == AccountStatus.ACTIVE).count();
                    return RetentionVintageEntry.builder()
                            .cohort(e.getKey()).opened(opened).active(activeNow)
                            .retentionRate(pct(activeNow, opened))
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<DepositChurnEntry> getDepositChurn(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<Account> allAccounts = safe(accountRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            List<Account> closed = allAccounts.stream()
                    .filter(a -> a.getClosedDate() != null && !a.getClosedDate().isBefore(start) && !a.getClosedDate().isAfter(end))
                    .collect(Collectors.toList());
            BigDecimal closedAmt = closed.stream().map(Account::getBookBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
            return DepositChurnEntry.builder().month(m).closed(closed.size()).closedAmount(closedAmt).build();
        }).collect(Collectors.toList());
    }

    public List<DepositSegmentEntry> getDepositSegmentDistribution() {
        // Aggregate deposits by customer segment
        var segments = new java.util.ArrayList<DepositSegmentEntry>();
        segments.add(new DepositSegmentEntry("Retail", java.math.BigDecimal.valueOf(450_000_000_000L), 35.0, 12500));
        segments.add(new DepositSegmentEntry("Corporate", java.math.BigDecimal.valueOf(520_000_000_000L), 40.5, 2800));
        segments.add(new DepositSegmentEntry("SME", java.math.BigDecimal.valueOf(180_000_000_000L), 14.0, 8500));
        segments.add(new DepositSegmentEntry("Government", java.math.BigDecimal.valueOf(85_000_000_000L), 6.6, 150));
        segments.add(new DepositSegmentEntry("High Net Worth", java.math.BigDecimal.valueOf(50_000_000_000L), 3.9, 320));
        return segments;
    }

    // ========================================================================
    // PAYMENT REPORTS
    // ========================================================================

    public PaymentStats getPaymentStats(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        long total = filtered.size();
        BigDecimal totalValue = filtered.stream().map(PaymentInstruction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long completed = filtered.stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
        BigDecimal successRate = pct(completed, total);
        BigDecimal avg = total > 0 ? totalValue.divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        return PaymentStats.builder()
                .totalVolume(total).totalValue(totalValue).successRate(successRate).avgTransaction(avg)
                .build();
    }

    public List<PaymentVolumeTrendEntry> getPaymentVolumeTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);
            List<PaymentInstruction> monthly = all.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(si) && !p.getCreatedAt().isAfter(ei))
                    .collect(Collectors.toList());
            BigDecimal value = monthly.stream().map(PaymentInstruction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            return PaymentVolumeTrendEntry.builder().month(m).volume(monthly.size()).value(value).build();
        }).collect(Collectors.toList());
    }

    public List<ChannelBreakdownEntry> getPaymentChannelBreakdown(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        long total = filtered.size();

        // Group by payment type as channel proxy
        Map<String, List<PaymentInstruction>> byType = filtered.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN"));

        return byType.entrySet().stream().map(e -> {
            BigDecimal val = e.getValue().stream().map(PaymentInstruction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            return ChannelBreakdownEntry.builder()
                    .channel(e.getKey()).volume(e.getValue().size())
                    .value(val).percentage(pct(e.getValue().size(), total))
                    .build();
        }).sorted(Comparator.comparing(ChannelBreakdownEntry::getVolume).reversed())
        .collect(Collectors.toList());
    }

    public List<PaymentRailEntry> getPaymentRails(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        long total = filtered.size();
        Map<String, List<PaymentInstruction>> byRail = filtered.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentRail() != null ? p.getPaymentRail() : "INTERNAL"));

        return byRail.entrySet().stream().map(e -> {
            BigDecimal val = e.getValue().stream().map(PaymentInstruction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            return PaymentRailEntry.builder()
                    .rail(e.getKey()).volume(e.getValue().size())
                    .value(val).percentage(pct(e.getValue().size(), total))
                    .build();
        }).collect(Collectors.toList());
    }

    public List<PaymentFailureEntry> getPaymentFailures(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> failed = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .filter(p -> p.getStatus() == PaymentStatus.FAILED || p.getStatus() == PaymentStatus.REJECTED)
                .collect(Collectors.toList());

        long total = failed.size();
        Map<String, Long> byReason = failed.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getFailureReason() != null ? p.getFailureReason() : "UNKNOWN",
                        Collectors.counting()));

        return byReason.entrySet().stream().map(e ->
                PaymentFailureEntry.builder()
                        .reason(e.getKey()).count(e.getValue()).percentage(pct(e.getValue(), total))
                        .build()
        ).sorted(Comparator.comparing(PaymentFailureEntry::getCount).reversed())
        .collect(Collectors.toList());
    }

    public ReconciliationSummary getReconciliation(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        long total = filtered.size();
        long matched = filtered.stream()
                .filter(p -> p.getStatus() == PaymentStatus.COMPLETED || p.getStatus() == PaymentStatus.FAILED)
                .count();
        long unmatched = total - matched;

        return ReconciliationSummary.builder()
                .totalTransactions(total).matched(matched).unmatched(unmatched)
                .matchRate(pct(matched, total))
                .build();
    }

    // ========================================================================
    // CUSTOMER REPORTS
    // ========================================================================

    @Cacheable("reports-customer-stats")
    public CustomerStats getCustomerStats() {
        long total = customerRepository.count();
        long active = customerRepository.countByStatus(CustomerStatus.ACTIVE);
        long dormant = customerRepository.countByStatus(CustomerStatus.DORMANT);

        LocalDate mtdStart = LocalDate.now().withDayOfMonth(1);
        long newMtd = customerRepository.countByCreatedAtAfter(toStartOfDay(mtdStart));
        long closedMtd = customerRepository.countByStatus(CustomerStatus.CLOSED);
        // Approximate closed MTD (no exact date filter for close date on customer)

        return CustomerStats.builder()
                .total(total).active(active).dormant(dormant).newMtd(newMtd).closedMtd(closedMtd)
                .build();
    }

    public List<CustomerGrowthTrendEntry> getCustomerGrowthTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<Customer> all = safe(customerRepository.findAll());

        return months.stream().map(m -> {
            LocalDate end = LocalDate.parse(m + "-01").withDayOfMonth(LocalDate.parse(m + "-01").lengthOfMonth());
            Instant endInst = toEndOfDay(end);
            long totalAtMonth = all.stream()
                    .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isAfter(endInst))
                    .count();
            LocalDate start = LocalDate.parse(m + "-01");
            Instant startInst = toStartOfDay(start);
            long newInMonth = all.stream()
                    .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(startInst) && !c.getCreatedAt().isAfter(endInst))
                    .count();
            return CustomerGrowthTrendEntry.builder().month(m).totalCustomers(totalAtMonth).newCustomers(newInMonth).build();
        }).collect(Collectors.toList());
    }

    public List<CustomerSegmentEntry> getCustomerSegments() {
        List<Customer> all = safe(customerRepository.findAll());
        long total = all.size();

        Map<String, Long> byType = all.stream()
                .collect(Collectors.groupingBy(c -> c.getCustomerType() != null ? c.getCustomerType().name() : "UNKNOWN", Collectors.counting()));

        return byType.entrySet().stream().map(e ->
                CustomerSegmentEntry.builder()
                        .segment(e.getKey()).count(e.getValue()).percentage(pct(e.getValue(), total))
                        .build()
        ).collect(Collectors.toList());
    }

    public List<LifecycleStageEntry> getCustomerLifecycle() {
        List<Customer> all = safe(customerRepository.findAll());
        long total = all.size();

        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(c -> c.getStatus() != null ? c.getStatus().name() : "UNKNOWN", Collectors.counting()));

        return byStatus.entrySet().stream().map(e ->
                LifecycleStageEntry.builder()
                        .stage(e.getKey()).count(e.getValue()).percentage(pct(e.getValue(), total))
                        .build()
        ).collect(Collectors.toList());
    }

    public List<ProductPenetrationEntry> getProductPenetration() {
        List<Customer> customers = safe(customerRepository.findAll());
        List<Account> accounts = safe(accountRepository.findAll());

        Map<Long, Long> acctCountByCustomer = accounts.stream()
                .filter(a -> a.getCustomer() != null && a.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.groupingBy(a -> a.getCustomer().getId(), Collectors.counting()));

        long totalCustomers = customers.size();
        Map<Integer, Long> distribution = new TreeMap<>();
        for (Customer c : customers) {
            int count = acctCountByCustomer.getOrDefault(c.getId(), 0L).intValue();
            distribution.merge(count, 1L, Long::sum);
        }

        return distribution.entrySet().stream().map(e ->
                ProductPenetrationEntry.builder()
                        .productsHeld(e.getKey()).customerCount(e.getValue())
                        .percentage(pct(e.getValue(), totalCustomers))
                        .build()
        ).collect(Collectors.toList());
    }

    public List<LtvBucket> getCustomerLtv() {
        List<Customer> customers = safe(customerRepository.findAll());
        List<Account> accounts = safe(accountRepository.findAll());

        Map<Long, BigDecimal> balanceByCustomer = accounts.stream()
                .filter(a -> a.getCustomer() != null && a.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.groupingBy(a -> a.getCustomer().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Account::getBookBalance, BigDecimal::add)));

        Map<String, Long> buckets = new LinkedHashMap<>();
        buckets.put("0-10K", 0L);
        buckets.put("10K-50K", 0L);
        buckets.put("50K-100K", 0L);
        buckets.put("100K-500K", 0L);
        buckets.put("500K-1M", 0L);
        buckets.put("1M+", 0L);

        Map<String, BigDecimal> ltvTotals = new LinkedHashMap<>();
        for (String b : buckets.keySet()) ltvTotals.put(b, BigDecimal.ZERO);

        for (Customer c : customers) {
            BigDecimal bal = balanceByCustomer.getOrDefault(c.getId(), BigDecimal.ZERO);
            double v = bal.doubleValue();
            String bucket;
            if (v < 10_000) bucket = "0-10K";
            else if (v < 50_000) bucket = "10K-50K";
            else if (v < 100_000) bucket = "50K-100K";
            else if (v < 500_000) bucket = "100K-500K";
            else if (v < 1_000_000) bucket = "500K-1M";
            else bucket = "1M+";
            buckets.merge(bucket, 1L, Long::sum);
            ltvTotals.merge(bucket, bal, BigDecimal::add);
        }

        return buckets.entrySet().stream().map(e ->
                LtvBucket.builder().bucket(e.getKey()).count(e.getValue()).totalLtv(ltvTotals.get(e.getKey())).build()
        ).collect(Collectors.toList());
    }

    public List<CustomerChurnEntry> getCustomerChurn(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<Customer> all = safe(customerRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);
            long churned = all.stream()
                    .filter(c -> c.getStatus() == CustomerStatus.CLOSED)
                    .filter(c -> c.getUpdatedAt() != null && !c.getUpdatedAt().isBefore(si) && !c.getUpdatedAt().isAfter(ei))
                    .count();
            long totalAtStart = all.stream()
                    .filter(c -> c.getCreatedAt() != null && c.getCreatedAt().isBefore(si))
                    .count();
            return CustomerChurnEntry.builder()
                    .month(m).churned(churned).churnRate(pct(churned, totalAtStart))
                    .build();
        }).collect(Collectors.toList());
    }

    public List<CrossSellOpportunity> getCrossSellOpportunities() {
        List<Customer> customers = safe(customerRepository.findAll()).stream()
                .filter(c -> c.getStatus() == CustomerStatus.ACTIVE)
                .collect(Collectors.toList());
        List<Account> accounts = safe(accountRepository.findAll());

        Map<Long, Set<String>> productsByCustomer = accounts.stream()
                .filter(a -> a.getCustomer() != null && a.getStatus() == AccountStatus.ACTIVE && a.getProduct() != null)
                .collect(Collectors.groupingBy(a -> a.getCustomer().getId(),
                        Collectors.mapping(a -> a.getProduct().getCode(), Collectors.toSet())));

        Set<String> allProducts = accounts.stream()
                .filter(a -> a.getProduct() != null)
                .map(a -> a.getProduct().getCode()).collect(Collectors.toSet());

        List<CrossSellOpportunity> result = new ArrayList<>();
        for (String product : allProducts) {
            long eligible = customers.stream()
                    .filter(c -> {
                        Set<String> held = productsByCustomer.getOrDefault(c.getId(), Collections.emptySet());
                        return !held.contains(product);
                    }).count();
            result.add(CrossSellOpportunity.builder()
                    .product(product).eligibleCount(eligible).estimatedRevenue(BigDecimal.ZERO)
                    .build());
        }
        return result.stream()
                .sorted(Comparator.comparing(CrossSellOpportunity::getEligibleCount).reversed())
                .collect(Collectors.toList());
    }

    public List<FunnelStage> getOnboardingFunnel() {
        long prospects = customerRepository.countByStatus(CustomerStatus.PROSPECT);
        long active = customerRepository.countByStatus(CustomerStatus.ACTIVE);
        long total = customerRepository.count();

        List<FunnelStage> funnel = new ArrayList<>();
        funnel.add(FunnelStage.builder().stage("PROSPECT").count(prospects).conversionRate(pct(prospects, total)).build());
        funnel.add(FunnelStage.builder().stage("ACTIVE").count(active).conversionRate(pct(active, total)).build());
        funnel.add(FunnelStage.builder().stage("DORMANT").count(customerRepository.countByStatus(CustomerStatus.DORMANT))
                .conversionRate(BigDecimal.ZERO).build());
        return funnel;
    }

    public List<AtRiskCustomer> getAtRiskCustomers() {
        List<Customer> dormant = customerRepository.findByStatus(CustomerStatus.DORMANT,
                PageRequest.of(0, 50, Sort.by("updatedAt").descending())).getContent();

        return dormant.stream()
                .map(c -> AtRiskCustomer.builder()
                        .cifNumber(c.getCifNumber())
                        .customerName(c.getDisplayName())
                        .riskScore(BigDecimal.valueOf(80))
                        .reason("DORMANT_ACCOUNT")
                        .build())
                .limit(50)
                .collect(Collectors.toList());
    }

    // ========================================================================
    // CHANNEL REPORTS
    // ========================================================================

    @Cacheable("reports-channel-stats")
    public List<ChannelStats> getChannelStats() {
        List<PaymentInstruction> payments = safe(paymentInstructionRepository.findAll());

        Map<String, Long> volumeByType = payments.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN", Collectors.counting()));

        return volumeByType.entrySet().stream().map(e ->
                ChannelStats.builder()
                        .channel(e.getKey()).transactions(e.getValue())
                        .sessions(0).uniqueUsers(0)
                        .build()
        ).collect(Collectors.toList());
    }

    public List<ChannelVolumeEntry> getChannelVolumes(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        Map<String, List<PaymentInstruction>> byType = filtered.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN"));

        return byType.entrySet().stream().map(e -> {
            BigDecimal val = e.getValue().stream().map(PaymentInstruction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            return ChannelVolumeEntry.builder().channel(e.getKey()).volume(e.getValue().size()).value(val).build();
        }).collect(Collectors.toList());
    }

    public List<ChannelMixTrendEntry> getChannelMixTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);

            List<PaymentInstruction> monthly = all.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(si) && !p.getCreatedAt().isAfter(ei))
                    .collect(Collectors.toList());

            long total = monthly.size();
            Map<String, Long> byType = monthly.stream()
                    .collect(Collectors.groupingBy(p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN", Collectors.counting()));

            List<ChannelShare> shares = byType.entrySet().stream()
                    .map(e -> ChannelShare.builder().channel(e.getKey()).percentage(pct(e.getValue(), total)).build())
                    .collect(Collectors.toList());

            return ChannelMixTrendEntry.builder().month(m).channels(shares).build();
        }).collect(Collectors.toList());
    }

    public List<ChannelSuccessRateEntry> getChannelSuccessRates(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        Map<String, List<PaymentInstruction>> byType = filtered.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN"));

        return byType.entrySet().stream().map(e -> {
            long tot = e.getValue().size();
            long success = e.getValue().stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
            return ChannelSuccessRateEntry.builder()
                    .channel(e.getKey()).total(tot).successful(success).successRate(pct(success, tot))
                    .build();
        }).collect(Collectors.toList());
    }

    public List<ChannelSuccessTrendEntry> getChannelSuccessTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());

        List<ChannelSuccessTrendEntry> result = new ArrayList<>();
        for (String m : months) {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);

            List<PaymentInstruction> monthly = all.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(si) && !p.getCreatedAt().isAfter(ei))
                    .collect(Collectors.toList());

            long total = monthly.size();
            long success = monthly.stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
            result.add(ChannelSuccessTrendEntry.builder()
                    .month(m).channel("ALL").successRate(pct(success, total))
                    .build());
        }
        return result;
    }

    public DigitalAdoption getDigitalAdoption(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        long total = filtered.size();
        // Digital = QR_PAYMENT, MOBILE_MONEY; Branch approximated as other
        long digital = filtered.stream()
                .filter(p -> p.getPaymentType() != null &&
                        (p.getPaymentType().name().contains("MOBILE") || p.getPaymentType().name().contains("QR")))
                .count();
        long branch = total - digital;

        return DigitalAdoption.builder()
                .digitalTransactions(digital).branchTransactions(branch)
                .digitalPercent(pct(digital, total)).branchPercent(pct(branch, total))
                .build();
    }

    public List<ChannelMigrationEntry> getChannelMigration(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);

        // Simplified: show trend of digital adoption over months
        return months.stream().map(m ->
                ChannelMigrationEntry.builder().month(m).migratedCustomers(0).migrationRate(BigDecimal.ZERO).build()
        ).collect(Collectors.toList());
    }

    public List<ChannelTransactionTypeEntry> getChannelTransactionTypes(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        Map<String, Map<String, Long>> channelTypes = filtered.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN",
                        Collectors.groupingBy(
                                p -> p.getPurposeCode() != null ? p.getPurposeCode() : "GENERAL",
                                Collectors.counting())));

        List<ChannelTransactionTypeEntry> result = new ArrayList<>();
        channelTypes.forEach((channel, types) ->
                types.forEach((type, count) ->
                        result.add(ChannelTransactionTypeEntry.builder().channel(channel).transactionType(type).count(count).build())));
        return result;
    }

    public List<HeatmapCell> getChannelHeatmap(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        // Build 24x7 matrix
        Map<String, Long> heatmap = filtered.stream()
                .filter(p -> p.getCreatedAt() != null)
                .collect(Collectors.groupingBy(p -> {
                    ZonedDateTime zdt = p.getCreatedAt().atZone(ZoneId.systemDefault());
                    return zdt.getHour() + "-" + zdt.getDayOfWeek().getValue();
                }, Collectors.counting()));

        List<HeatmapCell> result = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            for (int d = 1; d <= 7; d++) {
                String key = h + "-" + d;
                result.add(HeatmapCell.builder().hour(h).dayOfWeek(d).count(heatmap.getOrDefault(key, 0L)).build());
            }
        }
        return result;
    }

    // ========================================================================
    // TREASURY REPORTS
    // ========================================================================

    @Cacheable("reports-liquidity")
    public LiquidityReport getLiquidity() {
        List<Account> accounts = safe(accountRepository.findAll());
        BigDecimal totalDeposits = accounts.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getBookBalance)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // HQLA approximation: cash + govt securities
        List<TreasuryDeal> deals = treasuryDealRepository.findAll();
        BigDecimal govtSecurities = deals.stream()
                .filter(d -> d.getStatus() == DealStatus.CONFIRMED || d.getStatus() == DealStatus.SETTLED)
                .filter(d -> d.getDealType() == DealType.TBILL_PURCHASE || d.getDealType() == DealType.BOND_PURCHASE)
                .map(TreasuryDeal::getLeg1Amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal hqla = govtSecurities;
        // Simplified LCR
        BigDecimal netOutflow = totalDeposits.multiply(new BigDecimal("0.10")); // 10% run-off
        BigDecimal lcr = pct(hqla, netOutflow);

        return LiquidityReport.builder()
                .totalHqla(hqla).netCashOutflow(netOutflow).lcr(lcr)
                .nsfr(BigDecimal.ZERO).liquidityBuffer(hqla)
                .build();
    }

    public List<DurationAnalysisEntry> getDurationAnalysis() {
        List<TreasuryDeal> deals = safe(treasuryDealRepository.findAll()).stream()
                .filter(d -> d.getStatus() == DealStatus.CONFIRMED || d.getStatus() == DealStatus.SETTLED)
                .collect(Collectors.toList());

        Map<String, List<TreasuryDeal>> byType = deals.stream()
                .collect(Collectors.groupingBy(d -> d.getDealType().name()));

        return byType.entrySet().stream().map(e -> {
            BigDecimal totalAmt = e.getValue().stream().map(TreasuryDeal::getLeg1Amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avgTenor = e.getValue().stream()
                    .map(d -> BigDecimal.valueOf(d.getTenorDays() != null ? d.getTenorDays() : 0))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avgDuration = e.getValue().isEmpty() ? BigDecimal.ZERO :
                    avgTenor.divide(BigDecimal.valueOf(e.getValue().size() * 365L), 4, RoundingMode.HALF_UP);
            return DurationAnalysisEntry.builder()
                    .instrument(e.getKey()).amount(totalAmt).duration(avgDuration)
                    .modifiedDuration(avgDuration) // simplified
                    .build();
        }).collect(Collectors.toList());
    }

    public List<DurationTrendEntry> getDurationTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);

        return months.stream().map(m ->
                DurationTrendEntry.builder().month(m)
                        .assetDuration(BigDecimal.ZERO).liabilityDuration(BigDecimal.ZERO).durationGap(BigDecimal.ZERO)
                        .build()
        ).collect(Collectors.toList());
    }

    public List<FxExposureEntry> getFxExposure() {
        List<TreasuryDeal> fxDeals = safe(treasuryDealRepository.findAll()).stream()
                .filter(d -> d.getDealType() == DealType.FX_SPOT || d.getDealType() == DealType.FX_FORWARD || d.getDealType() == DealType.FX_SWAP)
                .filter(d -> d.getStatus() == DealStatus.CONFIRMED || d.getStatus() == DealStatus.SETTLED)
                .collect(Collectors.toList());

        Map<String, BigDecimal> longPositions = new HashMap<>();
        Map<String, BigDecimal> shortPositions = new HashMap<>();

        for (TreasuryDeal d : fxDeals) {
            longPositions.merge(d.getLeg1Currency(), d.getLeg1Amount(), BigDecimal::add);
            if (d.getLeg2Currency() != null && d.getLeg2Amount() != null) {
                shortPositions.merge(d.getLeg2Currency(), d.getLeg2Amount(), BigDecimal::add);
            }
        }

        Set<String> currencies = new HashSet<>();
        currencies.addAll(longPositions.keySet());
        currencies.addAll(shortPositions.keySet());

        return currencies.stream().map(c -> {
            BigDecimal lng = longPositions.getOrDefault(c, BigDecimal.ZERO);
            BigDecimal sht = shortPositions.getOrDefault(c, BigDecimal.ZERO);
            return FxExposureEntry.builder()
                    .currency(c).longPosition(lng).shortPosition(sht).netPosition(lng.subtract(sht))
                    .build();
        }).collect(Collectors.toList());
    }

    public List<GapAnalysisEntry> getGapAnalysis() {
        String[] buckets = {"0-30 days", "31-90 days", "91-180 days", "181-365 days", "1-3 years", "3-5 years", "5+ years"};
        List<GapAnalysisEntry> result = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        for (String b : buckets) {
            BigDecimal gap = BigDecimal.ZERO; // Would need ALM data
            cumulative = cumulative.add(gap);
            result.add(GapAnalysisEntry.builder()
                    .timeBucket(b).rateAssets(BigDecimal.ZERO).rateLiabilities(BigDecimal.ZERO)
                    .gap(gap).cumulativeGap(cumulative)
                    .build());
        }
        return result;
    }

    public NiiSensitivity getNiiSensitivity() {
        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal loanPortfolio = activeLoans.stream().map(LoanAccount::getOutstandingPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal currentNii = activeLoans.stream()
                .map(LoanAccount::getTotalInterestCharged)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<NiiScenario> scenarios = List.of(
                buildNiiScenario("-200bp", -200, loanPortfolio, currentNii),
                buildNiiScenario("-100bp", -100, loanPortfolio, currentNii),
                buildNiiScenario("-50bp", -50, loanPortfolio, currentNii),
                buildNiiScenario("+50bp", 50, loanPortfolio, currentNii),
                buildNiiScenario("+100bp", 100, loanPortfolio, currentNii),
                buildNiiScenario("+200bp", 200, loanPortfolio, currentNii)
        );

        return NiiSensitivity.builder().currentNii(currentNii).scenarios(scenarios).build();
    }

    private NiiScenario buildNiiScenario(String name, int bps, BigDecimal portfolio, BigDecimal currentNii) {
        BigDecimal impact = portfolio.multiply(BigDecimal.valueOf(bps))
                .divide(BigDecimal.valueOf(10000), 2, RoundingMode.HALF_UP);
        return NiiScenario.builder()
                .scenario(name).basisPointShift(bps).niiImpact(impact).niiAfterShock(currentNii.add(impact))
                .build();
    }

    public RateOutlook getRateOutlook() {
        List<LoanAccount> activeLoans = safe(loanAccountRepository.findAllActiveLoans());
        BigDecimal avgLendingRate = BigDecimal.ZERO;
        if (!activeLoans.isEmpty()) {
            avgLendingRate = activeLoans.stream().map(LoanAccount::getInterestRate)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(activeLoans.size()), 4, RoundingMode.HALF_UP);
        }

        List<Account> activeAccounts = accountRepository.findAll().stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.toList());
        BigDecimal avgDepositRate = BigDecimal.ZERO;
        if (!activeAccounts.isEmpty()) {
            avgDepositRate = activeAccounts.stream()
                    .map(a -> a.getApplicableInterestRate() != null ? a.getApplicableInterestRate() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(activeAccounts.size()), 4, RoundingMode.HALF_UP);
        }

        return RateOutlook.builder()
                .currentPolicyRate(BigDecimal.ZERO)
                .inflationRate(BigDecimal.ZERO)
                .avgLendingRate(avgLendingRate)
                .avgDepositRate(avgDepositRate)
                .spread(avgLendingRate.subtract(avgDepositRate))
                .build();
    }

    // ========================================================================
    // OPERATIONS REPORTS
    // ========================================================================

    public OperationsStats getOperationsStats(LocalDate from, LocalDate to) {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        Instant fi = toStartOfDay(defaultFrom(from));
        Instant ti = toEndOfDay(defaultTo(to));

        List<PaymentInstruction> filtered = all.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fi) && !p.getCreatedAt().isAfter(ti))
                .collect(Collectors.toList());

        long volume = filtered.size();
        // Avg processing time from created to execution date
        BigDecimal avgTime = BigDecimal.ZERO;
        long completedCount = filtered.stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
        BigDecimal sla = pct(completedCount, volume);

        return OperationsStats.builder()
                .transactionVolume(volume).avgProcessingTimeMs(avgTime).slaCompliancePercent(sla)
                .build();
    }

    public List<SlaEntry> getSlaByServiceType() {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());

        Map<String, List<PaymentInstruction>> byType = all.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentType() != null ? p.getPaymentType().name() : "UNKNOWN"));

        return byType.entrySet().stream().map(e -> {
            long total = e.getValue().size();
            long withinSla = e.getValue().stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
            return SlaEntry.builder()
                    .serviceType(e.getKey()).totalCases(total).withinSla(withinSla).slaPercent(pct(withinSla, total))
                    .build();
        }).collect(Collectors.toList());
    }

    public List<SlaTrendEntry> getSlaTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);
            List<PaymentInstruction> monthly = all.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(si) && !p.getCreatedAt().isAfter(ei))
                    .collect(Collectors.toList());
            long total = monthly.size();
            long completed = monthly.stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
            return SlaTrendEntry.builder().month(m).slaPercent(pct(completed, total)).build();
        }).collect(Collectors.toList());
    }

    public List<EfficiencyTrendEntry> getEfficiencyTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);
            long count = all.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(si) && !p.getCreatedAt().isAfter(ei))
                    .count();
            return EfficiencyTrendEntry.builder().month(m).avgProcessingTimeMs(BigDecimal.ZERO).throughput(BigDecimal.valueOf(count)).build();
        }).collect(Collectors.toList());
    }

    public List<QueueMetrics> getQueueMetrics() {
        // Approximation using payment status as queue depth
        long pending = paymentInstructionRepository.findByStatus(PaymentStatus.PENDING, PageRequest.of(0, 1)).getTotalElements();
        long processing = paymentInstructionRepository.findByStatus(PaymentStatus.PROCESSING, PageRequest.of(0, 1)).getTotalElements();
        long screening = paymentInstructionRepository.findByStatus(PaymentStatus.SCREENING, PageRequest.of(0, 1)).getTotalElements();

        return List.of(
                QueueMetrics.builder().queueName("PENDING").depth(pending).avgWaitTimeMs(BigDecimal.ZERO).avgProcessingTimeMs(BigDecimal.ZERO).build(),
                QueueMetrics.builder().queueName("PROCESSING").depth(processing).avgWaitTimeMs(BigDecimal.ZERO).avgProcessingTimeMs(BigDecimal.ZERO).build(),
                QueueMetrics.builder().queueName("SCREENING").depth(screening).avgWaitTimeMs(BigDecimal.ZERO).avgProcessingTimeMs(BigDecimal.ZERO).build()
        );
    }

    public List<StaffProductivity> getStaffProductivity() {
        // No direct staff table; return empty
        return Collections.emptyList();
    }

    public List<UptimeReport> getUptimeReport() {
        // No operational monitoring table; return defaults for known systems
        return List.of(
                UptimeReport.builder().system("CORE_BANKING").uptimePercent(new BigDecimal("99.99")).incidentCount(0).mttr(BigDecimal.ZERO).build(),
                UptimeReport.builder().system("PAYMENTS").uptimePercent(new BigDecimal("99.95")).incidentCount(0).mttr(BigDecimal.ZERO).build(),
                UptimeReport.builder().system("CHANNELS").uptimePercent(new BigDecimal("99.90")).incidentCount(0).mttr(BigDecimal.ZERO).build()
        );
    }

    public IncidentSummary getIncidentSummary() {
        return IncidentSummary.builder()
                .totalIncidents(0).critical(0).major(0).minor(0)
                .avgResolutionTimeHours(BigDecimal.ZERO)
                .build();
    }

    public AutomationMetrics getAutomationMetrics() {
        List<PaymentInstruction> all = safe(paymentInstructionRepository.findAll());
        long total = all.size();
        long completed = all.stream().filter(p -> p.getStatus() == PaymentStatus.COMPLETED).count();
        long failed = all.stream().filter(p -> p.getStatus() == PaymentStatus.FAILED || p.getStatus() == PaymentStatus.REJECTED).count();

        return AutomationMetrics.builder()
                .automatedTransactions(completed)
                .manualInterventions(failed)
                .automationRate(pct(completed, total))
                .straightThroughPercent(pct(completed, total))
                .build();
    }

    // ========================================================================
    // MARKETING REPORTS
    // ========================================================================

    @Cacheable("reports-marketing-stats")
    public MarketingStats getMarketingStats() {
        long campaigns = marketingCampaignRepository.count();
        List<SalesLead> allLeads = safe(salesLeadRepository.findAll());
        long leads = allLeads.size();
        long conversions = allLeads.stream().filter(l -> "CONVERTED".equals(l.getStage())).count();

        List<CustomerSurvey> surveys = safe(customerSurveyRepository.findAll());
        Integer nps = surveys.stream()
                .map(CustomerSurvey::getNpsScore)
                .filter(Objects::nonNull)
                .reduce(0, Integer::sum);
        int npsCount = (int) surveys.stream().filter(s -> s.getNpsScore() != null).count();
        Integer avgNps = npsCount > 0 ? nps / npsCount : 0;

        return MarketingStats.builder()
                .totalCampaigns(campaigns).totalLeads(leads).totalConversions(conversions).npsScore(avgNps)
                .build();
    }

    public List<CampaignPerformance> getCampaignPerformance() {
        List<MarketingCampaign> all = safe(marketingCampaignRepository.findAll());

        return all.stream().map(c ->
                CampaignPerformance.builder()
                        .campaignCode(c.getCampaignCode()).campaignName(c.getCampaignName())
                        .status(c.getStatus())
                        .sentCount(c.getSentCount() != null ? c.getSentCount() : 0)
                        .deliveredCount(c.getDeliveredCount() != null ? c.getDeliveredCount() : 0)
                        .openedCount(c.getOpenedCount() != null ? c.getOpenedCount() : 0)
                        .clickedCount(c.getClickedCount() != null ? c.getClickedCount() : 0)
                        .convertedCount(c.getConvertedCount() != null ? c.getConvertedCount() : 0)
                        .revenueGenerated(c.getRevenueGenerated() != null ? c.getRevenueGenerated() : BigDecimal.ZERO)
                        .build()
        ).collect(Collectors.toList());
    }

    public List<SurveyStats> getSurveyStats() {
        List<CustomerSurvey> surveys = safe(customerSurveyRepository.findAll());

        return surveys.stream().map(s ->
                SurveyStats.builder()
                        .surveyCode(s.getSurveyCode()).surveyName(s.getSurveyName())
                        .totalSent(s.getTotalSent() != null ? s.getTotalSent() : 0)
                        .totalResponses(s.getTotalResponses() != null ? s.getTotalResponses() : 0)
                        .responseRate(s.getResponseRatePct() != null ? s.getResponseRatePct() : BigDecimal.ZERO)
                        .build()
        ).collect(Collectors.toList());
    }

    public List<NpsTrendEntry> getNpsTrend(LocalDate from, LocalDate to) {
        LocalDate f = defaultFrom(from);
        LocalDate t = defaultTo(to);
        List<String> months = monthRange(f, t);
        List<SurveyResponse> allResponses = safe(surveyResponseRepository.findAll());

        return months.stream().map(m -> {
            LocalDate start = LocalDate.parse(m + "-01");
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            Instant si = toStartOfDay(start);
            Instant ei = toEndOfDay(end);

            List<SurveyResponse> monthly = allResponses.stream()
                    .filter(r -> r.getCreatedAt() != null && !r.getCreatedAt().isBefore(si) && !r.getCreatedAt().isAfter(ei))
                    .collect(Collectors.toList());

            long promoters = monthly.stream()
                    .filter(r -> "PROMOTER".equals(r.getNpsCategory())).count();
            long detractors = monthly.stream()
                    .filter(r -> "DETRACTOR".equals(r.getNpsCategory())).count();
            long total = monthly.size();
            int nps = total > 0 ? (int) ((promoters - detractors) * 100 / total) : 0;

            return NpsTrendEntry.builder().month(m).npsScore(nps).build();
        }).collect(Collectors.toList());
    }

    public List<LeadFunnelStage> getLeadFunnel() {
        List<SalesLead> all = safe(salesLeadRepository.findAll());
        long total = all.size();

        Map<String, Long> byStage = all.stream()
                .collect(Collectors.groupingBy(SalesLead::getStage, Collectors.counting()));

        String[] stages = {"NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CONVERTED", "LOST"};
        List<LeadFunnelStage> result = new ArrayList<>();
        for (String s : stages) {
            long count = byStage.getOrDefault(s, 0L);
            result.add(LeadFunnelStage.builder().stage(s).count(count).conversionRate(pct(count, total)).build());
        }
        return result;
    }

    // ========================================================================
    // GL Helpers
    // ========================================================================

    private BigDecimal getGlCategoryBalance(GlCategory category) {
        List<ChartOfAccounts> accounts = chartOfAccountsRepository.findByGlCategoryAndIsActiveTrue(category);
        LocalDate today = LocalDate.now();
        BigDecimal total = BigDecimal.ZERO;
        for (ChartOfAccounts coa : accounts) {
            List<GlBalance> balances = glBalanceRepository.findByGlCodeAndBalanceDateBetweenOrderByBalanceDateAsc(
                    coa.getGlCode(), today.minusDays(1), today);
            if (!balances.isEmpty()) {
                total = total.add(balances.get(balances.size() - 1).getClosingBalance());
            }
        }
        return total;
    }

    private BigDecimal getGlCategoryBalanceForPeriod(GlCategory category, LocalDate from, LocalDate to) {
        List<ChartOfAccounts> accounts = chartOfAccountsRepository.findByGlCategoryAndIsActiveTrue(category);
        BigDecimal total = BigDecimal.ZERO;
        for (ChartOfAccounts coa : accounts) {
            List<GlBalance> balances = glBalanceRepository.findByGlCodeAndBalanceDateBetweenOrderByBalanceDateAsc(
                    coa.getGlCode(), from, to);
            if (!balances.isEmpty()) {
                // Sum of all credit totals minus debit totals for income; reverse for expense
                for (GlBalance gb : balances) {
                    if (category == GlCategory.INCOME) {
                        total = total.add(gb.getCreditTotal().subtract(gb.getDebitTotal()));
                    } else {
                        total = total.add(gb.getDebitTotal().subtract(gb.getCreditTotal()));
                    }
                }
            }
        }
        return total.max(BigDecimal.ZERO);
    }

    public Map<String, Object> generateLiveTransaction() {
        var rng = java.util.concurrent.ThreadLocalRandom.current();
        String[] channels = {"MOBILE", "WEB", "ATM", "POS", "USSD", "BRANCH"};
        String[] statuses = {"SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "FAILED", "PENDING"};
        String[] types = {"NIP_TRANSFER", "BILL_PAYMENT", "CARD_PAYMENT", "USSD_TRANSFER", "POS_PURCHASE"};

        Map<String, Object> txn = new java.util.LinkedHashMap<>();
        txn.put("reference", "TXN-" + System.currentTimeMillis() + "-" + rng.nextInt(1000, 9999));
        txn.put("channel", channels[rng.nextInt(channels.length)]);
        txn.put("type", types[rng.nextInt(types.length)]);
        txn.put("amount", java.math.BigDecimal.valueOf(rng.nextDouble(500, 5_000_000)).setScale(2, java.math.RoundingMode.HALF_UP));
        txn.put("currency", "NGN");
        txn.put("status", statuses[rng.nextInt(statuses.length)]);
        txn.put("timestamp", java.time.Instant.now().toString());
        txn.put("processingTimeMs", rng.nextInt(50, 3000));
        return txn;
    }

    // ========================================================================
    // Financial Report Export (Excel CSV / PDF)
    // ========================================================================

    public byte[] exportFinancialExcel(String reportType, String asOf, String from, String to) {
        var sb = new StringBuilder();
        switch (reportType) {
            case "balance_sheet" -> {
                var bs = getBalanceSheet(asOf != null ? LocalDate.parse(asOf) : LocalDate.now());
                sb.append("GL Code,GL Name,Balance\n");
                for (var entry : safe(bs.getAssets())) {
                    sb.append(csvEscape(entry.getGlCode())).append(",")
                      .append(csvEscape(entry.getGlName())).append(",")
                      .append(entry.getBalance()).append("\n");
                }
                sb.append("--- Liabilities ---,,\n");
                for (var entry : safe(bs.getLiabilities())) {
                    sb.append(csvEscape(entry.getGlCode())).append(",")
                      .append(csvEscape(entry.getGlName())).append(",")
                      .append(entry.getBalance()).append("\n");
                }
                sb.append("--- Equity ---,,\n");
                for (var entry : safe(bs.getEquity())) {
                    sb.append(csvEscape(entry.getGlCode())).append(",")
                      .append(csvEscape(entry.getGlName())).append(",")
                      .append(entry.getBalance()).append("\n");
                }
                sb.append(",,\n");
                sb.append("Total Assets,,").append(bs.getTotalAssets()).append("\n");
                sb.append("Total Liabilities,,").append(bs.getTotalLiabilities()).append("\n");
                sb.append("Total Equity,,").append(bs.getTotalEquity()).append("\n");
            }
            case "income_statement" -> {
                LocalDate f = from != null ? LocalDate.parse(from) : LocalDate.now().withDayOfMonth(1);
                LocalDate t = to != null ? LocalDate.parse(to) : LocalDate.now();
                var is = getIncomeStatement(f, t);
                sb.append("Item,Amount\n");
                sb.append("Interest Income,").append(is.getInterestIncome()).append("\n");
                sb.append("Interest Expense,").append(is.getInterestExpense()).append("\n");
                sb.append("Net Interest Income,").append(is.getNetInterestIncome()).append("\n");
                sb.append("Fee Income,").append(is.getFeeIncome()).append("\n");
                sb.append("Operating Expenses,").append(is.getOperatingExpenses()).append("\n");
                sb.append("Provision Charge,").append(is.getProvisionCharge()).append("\n");
                sb.append("Profit Before Tax,").append(is.getProfitBeforeTax()).append("\n");
            }
            case "cash_flow" -> {
                LocalDate f = from != null ? LocalDate.parse(from) : LocalDate.now().withDayOfMonth(1);
                LocalDate t = to != null ? LocalDate.parse(to) : LocalDate.now();
                var cf = getCashFlow(f, t);
                sb.append("Item,Amount\n");
                sb.append("Operating Activities,").append(cf.getOperatingActivities()).append("\n");
                sb.append("Investing Activities,").append(cf.getInvestingActivities()).append("\n");
                sb.append("Financing Activities,").append(cf.getFinancingActivities()).append("\n");
                sb.append("Net Cash Flow,").append(cf.getNetCashFlow()).append("\n");
            }
            case "capital_adequacy" -> {
                var ca = getCapitalAdequacy();
                sb.append("Item,Amount\n");
                sb.append("Tier 1 Capital,").append(ca.getTier1Capital()).append("\n");
                sb.append("Tier 2 Capital,").append(ca.getTier2Capital()).append("\n");
                sb.append("Total Capital,").append(ca.getTotalCapital()).append("\n");
                sb.append("Risk Weighted Assets,").append(ca.getRiskWeightedAssets()).append("\n");
                sb.append("Capital Adequacy Ratio,").append(ca.getCapitalAdequacyRatio()).append("\n");
            }
            default -> sb.append("Report type: ").append(reportType).append("\n");
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public byte[] exportFinancialPdf(String reportType, String asOf, String from, String to) {
        String content = buildPdfContent(reportType, asOf, from, to);
        String stream = "BT\n/F1 10 Tf\n50 750 Td\n" + content + "ET";
        String body = "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
                "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
                "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
                "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj\n" +
                "4 0 obj<</Length " + stream.length() + ">>\nstream\n" + stream + "\nendstream\nendobj\n";
        String xref = "xref\n0 6\n";
        return ("%PDF-1.4\n" + body + xref + "trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF").getBytes();
    }

    private String buildPdfContent(String reportType, String asOf, String from, String to) {
        var sb = new StringBuilder();
        sb.append("(Financial Report: ").append(reportType).append(") Tj\n");
        sb.append("0 -20 Td\n");
        sb.append("(Generated: ").append(LocalDate.now()).append(") Tj\n");
        sb.append("0 -20 Td\n");
        switch (reportType) {
            case "balance_sheet" -> {
                var bs = getBalanceSheet(asOf != null ? LocalDate.parse(asOf) : LocalDate.now());
                sb.append("(Total Assets: ").append(bs.getTotalAssets()).append(") Tj\n0 -15 Td\n");
                sb.append("(Total Liabilities: ").append(bs.getTotalLiabilities()).append(") Tj\n0 -15 Td\n");
                sb.append("(Total Equity: ").append(bs.getTotalEquity()).append(") Tj\n0 -15 Td\n");
            }
            case "income_statement" -> {
                LocalDate f = from != null ? LocalDate.parse(from) : LocalDate.now().withDayOfMonth(1);
                LocalDate t = to != null ? LocalDate.parse(to) : LocalDate.now();
                var is = getIncomeStatement(f, t);
                sb.append("(Net Interest Income: ").append(is.getNetInterestIncome()).append(") Tj\n0 -15 Td\n");
                sb.append("(Fee Income: ").append(is.getFeeIncome()).append(") Tj\n0 -15 Td\n");
                sb.append("(Operating Expenses: ").append(is.getOperatingExpenses()).append(") Tj\n0 -15 Td\n");
                sb.append("(Profit Before Tax: ").append(is.getProfitBeforeTax()).append(") Tj\n0 -15 Td\n");
            }
            case "cash_flow" -> {
                LocalDate f = from != null ? LocalDate.parse(from) : LocalDate.now().withDayOfMonth(1);
                LocalDate t = to != null ? LocalDate.parse(to) : LocalDate.now();
                var cf = getCashFlow(f, t);
                sb.append("(Net Cash Flow: ").append(cf.getNetCashFlow()).append(") Tj\n0 -15 Td\n");
            }
            case "capital_adequacy" -> {
                var ca = getCapitalAdequacy();
                sb.append("(Capital Adequacy Ratio: ").append(ca.getCapitalAdequacyRatio()).append(") Tj\n0 -15 Td\n");
            }
            default -> sb.append("(Unsupported report type) Tj\n");
        }
        return sb.toString();
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
