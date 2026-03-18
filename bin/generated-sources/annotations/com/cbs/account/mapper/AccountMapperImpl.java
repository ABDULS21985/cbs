package com.cbs.account.mapper;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.InterestTierDto;
import com.cbs.account.dto.ProductDto;
import com.cbs.account.dto.SignatoryDto;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountSignatory;
import com.cbs.account.entity.InterestTier;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.ProductCategory;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.customer.entity.Customer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-18T01:12:19+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class AccountMapperImpl implements AccountMapper {

    @Override
    public AccountResponse toResponse(Account account) {
        if ( account == null ) {
            return null;
        }

        AccountResponse.AccountResponseBuilder accountResponse = AccountResponse.builder();

        accountResponse.customerId( accountCustomerId( account ) );
        accountResponse.customerCifNumber( accountCustomerCifNumber( account ) );
        accountResponse.productCode( accountProductCode( account ) );
        accountResponse.productName( accountProductName( account ) );
        accountResponse.productCategory( accountProductProductCategory( account ) );
        accountResponse.id( account.getId() );
        accountResponse.accountNumber( account.getAccountNumber() );
        accountResponse.accountName( account.getAccountName() );
        accountResponse.currencyCode( account.getCurrencyCode() );
        accountResponse.accountType( account.getAccountType() );
        accountResponse.status( account.getStatus() );
        accountResponse.bookBalance( account.getBookBalance() );
        accountResponse.availableBalance( account.getAvailableBalance() );
        accountResponse.lienAmount( account.getLienAmount() );
        accountResponse.overdraftLimit( account.getOverdraftLimit() );
        accountResponse.accruedInterest( account.getAccruedInterest() );
        accountResponse.applicableInterestRate( account.getApplicableInterestRate() );
        accountResponse.lastInterestCalcDate( account.getLastInterestCalcDate() );
        accountResponse.lastInterestPostDate( account.getLastInterestPostDate() );
        accountResponse.openedDate( account.getOpenedDate() );
        accountResponse.activatedDate( account.getActivatedDate() );
        accountResponse.lastTransactionDate( account.getLastTransactionDate() );
        accountResponse.dormancyDate( account.getDormancyDate() );
        accountResponse.closedDate( account.getClosedDate() );
        accountResponse.maturityDate( account.getMaturityDate() );
        accountResponse.branchCode( account.getBranchCode() );
        accountResponse.relationshipManager( account.getRelationshipManager() );
        accountResponse.statementFrequency( account.getStatementFrequency() );
        accountResponse.allowDebit( account.getAllowDebit() );
        accountResponse.allowCredit( account.getAllowCredit() );
        accountResponse.signatories( toSignatoryDtoList( account.getSignatories() ) );
        Map<String, Object> map = account.getMetadata();
        if ( map != null ) {
            accountResponse.metadata( new LinkedHashMap<String, Object>( map ) );
        }
        accountResponse.createdAt( account.getCreatedAt() );

        accountResponse.customerDisplayName( account.getCustomer().getDisplayName() );

        return accountResponse.build();
    }

    @Override
    public List<AccountResponse> toResponseList(List<Account> accounts) {
        if ( accounts == null ) {
            return null;
        }

        List<AccountResponse> list = new ArrayList<AccountResponse>( accounts.size() );
        for ( Account account : accounts ) {
            list.add( toResponse( account ) );
        }

        return list;
    }

    @Override
    public SignatoryDto toSignatoryDto(AccountSignatory signatory) {
        if ( signatory == null ) {
            return null;
        }

        SignatoryDto.SignatoryDtoBuilder signatoryDto = SignatoryDto.builder();

        signatoryDto.customerId( signatoryCustomerId( signatory ) );
        signatoryDto.customerCifNumber( signatoryCustomerCifNumber( signatory ) );
        signatoryDto.id( signatory.getId() );
        signatoryDto.signatoryType( signatory.getSignatoryType() );
        signatoryDto.signingRule( signatory.getSigningRule() );
        signatoryDto.isActive( signatory.getIsActive() );
        signatoryDto.effectiveFrom( signatory.getEffectiveFrom() );
        signatoryDto.effectiveTo( signatory.getEffectiveTo() );

        signatoryDto.customerDisplayName( signatory.getCustomer().getDisplayName() );

        return signatoryDto.build();
    }

    @Override
    public List<SignatoryDto> toSignatoryDtoList(List<AccountSignatory> signatories) {
        if ( signatories == null ) {
            return null;
        }

        List<SignatoryDto> list = new ArrayList<SignatoryDto>( signatories.size() );
        for ( AccountSignatory accountSignatory : signatories ) {
            list.add( toSignatoryDto( accountSignatory ) );
        }

        return list;
    }

    @Override
    public TransactionResponse toTransactionResponse(TransactionJournal journal) {
        if ( journal == null ) {
            return null;
        }

        TransactionResponse.TransactionResponseBuilder transactionResponse = TransactionResponse.builder();

        transactionResponse.accountNumber( journalAccountAccountNumber( journal ) );
        transactionResponse.id( journal.getId() );
        transactionResponse.transactionRef( journal.getTransactionRef() );
        transactionResponse.transactionType( journal.getTransactionType() );
        transactionResponse.amount( journal.getAmount() );
        transactionResponse.currencyCode( journal.getCurrencyCode() );
        transactionResponse.runningBalance( journal.getRunningBalance() );
        transactionResponse.narration( journal.getNarration() );
        transactionResponse.valueDate( journal.getValueDate() );
        transactionResponse.postingDate( journal.getPostingDate() );
        transactionResponse.contraAccountNumber( journal.getContraAccountNumber() );
        transactionResponse.channel( journal.getChannel() );
        transactionResponse.externalRef( journal.getExternalRef() );
        transactionResponse.status( journal.getStatus() );
        transactionResponse.isReversed( journal.getIsReversed() );
        transactionResponse.createdAt( journal.getCreatedAt() );
        transactionResponse.createdBy( journal.getCreatedBy() );

        return transactionResponse.build();
    }

    @Override
    public List<TransactionResponse> toTransactionResponseList(List<TransactionJournal> journals) {
        if ( journals == null ) {
            return null;
        }

        List<TransactionResponse> list = new ArrayList<TransactionResponse>( journals.size() );
        for ( TransactionJournal transactionJournal : journals ) {
            list.add( toTransactionResponse( transactionJournal ) );
        }

        return list;
    }

    @Override
    public ProductDto toProductDto(Product product) {
        if ( product == null ) {
            return null;
        }

        ProductDto.ProductDtoBuilder productDto = ProductDto.builder();

        productDto.id( product.getId() );
        productDto.code( product.getCode() );
        productDto.name( product.getName() );
        productDto.description( product.getDescription() );
        productDto.productCategory( product.getProductCategory() );
        productDto.currencyCode( product.getCurrencyCode() );
        productDto.minOpeningBalance( product.getMinOpeningBalance() );
        productDto.minOperatingBalance( product.getMinOperatingBalance() );
        productDto.maxBalance( product.getMaxBalance() );
        productDto.allowsOverdraft( product.getAllowsOverdraft() );
        productDto.maxOverdraftLimit( product.getMaxOverdraftLimit() );
        productDto.allowsChequeBook( product.getAllowsChequeBook() );
        productDto.allowsDebitCard( product.getAllowsDebitCard() );
        productDto.allowsMobile( product.getAllowsMobile() );
        productDto.allowsInternet( product.getAllowsInternet() );
        productDto.allowsSweep( product.getAllowsSweep() );
        productDto.dormancyDays( product.getDormancyDays() );
        productDto.interestBearing( product.getInterestBearing() );
        productDto.baseInterestRate( product.getBaseInterestRate() );
        productDto.interestCalcMethod( product.getInterestCalcMethod() );
        productDto.interestPostingFrequency( product.getInterestPostingFrequency() );
        productDto.interestAccrualMethod( product.getInterestAccrualMethod() );
        productDto.monthlyMaintenanceFee( product.getMonthlyMaintenanceFee() );
        productDto.smsAlertFee( product.getSmsAlertFee() );
        productDto.glAccountCode( product.getGlAccountCode() );
        productDto.glInterestExpenseCode( product.getGlInterestExpenseCode() );
        productDto.glInterestPayableCode( product.getGlInterestPayableCode() );
        productDto.glFeeIncomeCode( product.getGlFeeIncomeCode() );
        productDto.isActive( product.getIsActive() );
        productDto.interestTiers( toInterestTierDtoList( product.getInterestTiers() ) );
        productDto.createdAt( product.getCreatedAt() );

        return productDto.build();
    }

    @Override
    public List<ProductDto> toProductDtoList(List<Product> products) {
        if ( products == null ) {
            return null;
        }

        List<ProductDto> list = new ArrayList<ProductDto>( products.size() );
        for ( Product product : products ) {
            list.add( toProductDto( product ) );
        }

        return list;
    }

    @Override
    public InterestTierDto toInterestTierDto(InterestTier tier) {
        if ( tier == null ) {
            return null;
        }

        InterestTierDto.InterestTierDtoBuilder interestTierDto = InterestTierDto.builder();

        interestTierDto.id( tier.getId() );
        interestTierDto.tierName( tier.getTierName() );
        interestTierDto.minBalance( tier.getMinBalance() );
        interestTierDto.maxBalance( tier.getMaxBalance() );
        interestTierDto.interestRate( tier.getInterestRate() );
        interestTierDto.effectiveFrom( tier.getEffectiveFrom() );
        interestTierDto.effectiveTo( tier.getEffectiveTo() );
        interestTierDto.isActive( tier.getIsActive() );

        return interestTierDto.build();
    }

    @Override
    public List<InterestTierDto> toInterestTierDtoList(List<InterestTier> tiers) {
        if ( tiers == null ) {
            return null;
        }

        List<InterestTierDto> list = new ArrayList<InterestTierDto>( tiers.size() );
        for ( InterestTier interestTier : tiers ) {
            list.add( toInterestTierDto( interestTier ) );
        }

        return list;
    }

    @Override
    public Product toProductEntity(ProductDto dto) {
        if ( dto == null ) {
            return null;
        }

        Product.ProductBuilder<?, ?> product = Product.builder();

        product.code( dto.getCode() );
        product.name( dto.getName() );
        product.description( dto.getDescription() );
        product.productCategory( dto.getProductCategory() );
        product.currencyCode( dto.getCurrencyCode() );
        product.minOpeningBalance( dto.getMinOpeningBalance() );
        product.minOperatingBalance( dto.getMinOperatingBalance() );
        product.maxBalance( dto.getMaxBalance() );
        product.allowsOverdraft( dto.getAllowsOverdraft() );
        product.maxOverdraftLimit( dto.getMaxOverdraftLimit() );
        product.allowsChequeBook( dto.getAllowsChequeBook() );
        product.allowsDebitCard( dto.getAllowsDebitCard() );
        product.allowsMobile( dto.getAllowsMobile() );
        product.allowsInternet( dto.getAllowsInternet() );
        product.allowsSweep( dto.getAllowsSweep() );
        product.dormancyDays( dto.getDormancyDays() );
        product.interestBearing( dto.getInterestBearing() );
        product.baseInterestRate( dto.getBaseInterestRate() );
        product.interestCalcMethod( dto.getInterestCalcMethod() );
        product.interestPostingFrequency( dto.getInterestPostingFrequency() );
        product.interestAccrualMethod( dto.getInterestAccrualMethod() );
        product.monthlyMaintenanceFee( dto.getMonthlyMaintenanceFee() );
        product.smsAlertFee( dto.getSmsAlertFee() );
        product.glAccountCode( dto.getGlAccountCode() );
        product.glInterestExpenseCode( dto.getGlInterestExpenseCode() );
        product.glInterestPayableCode( dto.getGlInterestPayableCode() );
        product.glFeeIncomeCode( dto.getGlFeeIncomeCode() );
        product.isActive( dto.getIsActive() );

        return product.build();
    }

    @Override
    public InterestTier toInterestTierEntity(InterestTierDto dto) {
        if ( dto == null ) {
            return null;
        }

        InterestTier.InterestTierBuilder<?, ?> interestTier = InterestTier.builder();

        interestTier.tierName( dto.getTierName() );
        interestTier.minBalance( dto.getMinBalance() );
        interestTier.maxBalance( dto.getMaxBalance() );
        interestTier.interestRate( dto.getInterestRate() );
        interestTier.effectiveFrom( dto.getEffectiveFrom() );
        interestTier.effectiveTo( dto.getEffectiveTo() );
        interestTier.isActive( dto.getIsActive() );

        return interestTier.build();
    }

    private Long accountCustomerId(Account account) {
        Customer customer = account.getCustomer();
        if ( customer == null ) {
            return null;
        }
        return customer.getId();
    }

    private String accountCustomerCifNumber(Account account) {
        Customer customer = account.getCustomer();
        if ( customer == null ) {
            return null;
        }
        return customer.getCifNumber();
    }

    private String accountProductCode(Account account) {
        Product product = account.getProduct();
        if ( product == null ) {
            return null;
        }
        return product.getCode();
    }

    private String accountProductName(Account account) {
        Product product = account.getProduct();
        if ( product == null ) {
            return null;
        }
        return product.getName();
    }

    private ProductCategory accountProductProductCategory(Account account) {
        Product product = account.getProduct();
        if ( product == null ) {
            return null;
        }
        return product.getProductCategory();
    }

    private Long signatoryCustomerId(AccountSignatory accountSignatory) {
        Customer customer = accountSignatory.getCustomer();
        if ( customer == null ) {
            return null;
        }
        return customer.getId();
    }

    private String signatoryCustomerCifNumber(AccountSignatory accountSignatory) {
        Customer customer = accountSignatory.getCustomer();
        if ( customer == null ) {
            return null;
        }
        return customer.getCifNumber();
    }

    private String journalAccountAccountNumber(TransactionJournal transactionJournal) {
        Account account = transactionJournal.getAccount();
        if ( account == null ) {
            return null;
        }
        return account.getAccountNumber();
    }
}
