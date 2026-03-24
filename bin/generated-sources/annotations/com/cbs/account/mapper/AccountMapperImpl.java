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
    date = "2026-03-24T20:07:53+0100",
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
        accountResponse.accountName( account.getAccountName() );
        accountResponse.accountNumber( account.getAccountNumber() );
        accountResponse.accountType( account.getAccountType() );
        accountResponse.accruedInterest( account.getAccruedInterest() );
        accountResponse.activatedDate( account.getActivatedDate() );
        accountResponse.allowCredit( account.getAllowCredit() );
        accountResponse.allowDebit( account.getAllowDebit() );
        accountResponse.applicableInterestRate( account.getApplicableInterestRate() );
        accountResponse.availableBalance( account.getAvailableBalance() );
        accountResponse.bookBalance( account.getBookBalance() );
        accountResponse.branchCode( account.getBranchCode() );
        accountResponse.closedDate( account.getClosedDate() );
        accountResponse.createdAt( account.getCreatedAt() );
        accountResponse.currencyCode( account.getCurrencyCode() );
        accountResponse.dormancyDate( account.getDormancyDate() );
        accountResponse.id( account.getId() );
        accountResponse.lastInterestCalcDate( account.getLastInterestCalcDate() );
        accountResponse.lastInterestPostDate( account.getLastInterestPostDate() );
        accountResponse.lastTransactionDate( account.getLastTransactionDate() );
        accountResponse.lienAmount( account.getLienAmount() );
        accountResponse.maturityDate( account.getMaturityDate() );
        Map<String, Object> map = account.getMetadata();
        if ( map != null ) {
            accountResponse.metadata( new LinkedHashMap<String, Object>( map ) );
        }
        accountResponse.openedDate( account.getOpenedDate() );
        accountResponse.overdraftLimit( account.getOverdraftLimit() );
        accountResponse.relationshipManager( account.getRelationshipManager() );
        accountResponse.signatories( toSignatoryDtoList( account.getSignatories() ) );
        accountResponse.statementFrequency( account.getStatementFrequency() );
        accountResponse.status( account.getStatus() );

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
        signatoryDto.effectiveFrom( signatory.getEffectiveFrom() );
        signatoryDto.effectiveTo( signatory.getEffectiveTo() );
        signatoryDto.id( signatory.getId() );
        signatoryDto.isActive( signatory.getIsActive() );
        signatoryDto.signatoryType( signatory.getSignatoryType() );
        signatoryDto.signingRule( signatory.getSigningRule() );

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
        transactionResponse.amount( journal.getAmount() );
        if ( journal.getChannel() != null ) {
            transactionResponse.channel( journal.getChannel().name() );
        }
        transactionResponse.contraAccountNumber( journal.getContraAccountNumber() );
        transactionResponse.createdAt( journal.getCreatedAt() );
        transactionResponse.createdBy( journal.getCreatedBy() );
        transactionResponse.currencyCode( journal.getCurrencyCode() );
        transactionResponse.externalRef( journal.getExternalRef() );
        transactionResponse.id( journal.getId() );
        transactionResponse.isReversed( journal.getIsReversed() );
        transactionResponse.narration( journal.getNarration() );
        transactionResponse.postingDate( journal.getPostingDate() );
        transactionResponse.runningBalance( journal.getRunningBalance() );
        transactionResponse.status( journal.getStatus() );
        transactionResponse.transactionRef( journal.getTransactionRef() );
        transactionResponse.transactionType( journal.getTransactionType() );
        transactionResponse.valueDate( journal.getValueDate() );

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

        productDto.allowsChequeBook( product.getAllowsChequeBook() );
        productDto.allowsDebitCard( product.getAllowsDebitCard() );
        productDto.allowsInternet( product.getAllowsInternet() );
        productDto.allowsMobile( product.getAllowsMobile() );
        productDto.allowsOverdraft( product.getAllowsOverdraft() );
        productDto.allowsSweep( product.getAllowsSweep() );
        productDto.baseInterestRate( product.getBaseInterestRate() );
        productDto.code( product.getCode() );
        productDto.createdAt( product.getCreatedAt() );
        productDto.currencyCode( product.getCurrencyCode() );
        productDto.description( product.getDescription() );
        productDto.dormancyDays( product.getDormancyDays() );
        productDto.glAccountCode( product.getGlAccountCode() );
        productDto.glFeeIncomeCode( product.getGlFeeIncomeCode() );
        productDto.glInterestExpenseCode( product.getGlInterestExpenseCode() );
        productDto.glInterestPayableCode( product.getGlInterestPayableCode() );
        productDto.id( product.getId() );
        productDto.interestAccrualMethod( product.getInterestAccrualMethod() );
        productDto.interestBearing( product.getInterestBearing() );
        productDto.interestCalcMethod( product.getInterestCalcMethod() );
        productDto.interestPostingFrequency( product.getInterestPostingFrequency() );
        productDto.interestTiers( toInterestTierDtoList( product.getInterestTiers() ) );
        productDto.isActive( product.getIsActive() );
        productDto.maxBalance( product.getMaxBalance() );
        productDto.maxOverdraftLimit( product.getMaxOverdraftLimit() );
        productDto.minOpeningBalance( product.getMinOpeningBalance() );
        productDto.minOperatingBalance( product.getMinOperatingBalance() );
        productDto.monthlyMaintenanceFee( product.getMonthlyMaintenanceFee() );
        productDto.name( product.getName() );
        productDto.productCategory( product.getProductCategory() );
        productDto.smsAlertFee( product.getSmsAlertFee() );

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

        interestTierDto.effectiveFrom( tier.getEffectiveFrom() );
        interestTierDto.effectiveTo( tier.getEffectiveTo() );
        interestTierDto.id( tier.getId() );
        interestTierDto.interestRate( tier.getInterestRate() );
        interestTierDto.isActive( tier.getIsActive() );
        interestTierDto.maxBalance( tier.getMaxBalance() );
        interestTierDto.minBalance( tier.getMinBalance() );
        interestTierDto.tierName( tier.getTierName() );

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

        product.allowsChequeBook( dto.getAllowsChequeBook() );
        product.allowsDebitCard( dto.getAllowsDebitCard() );
        product.allowsInternet( dto.getAllowsInternet() );
        product.allowsMobile( dto.getAllowsMobile() );
        product.allowsOverdraft( dto.getAllowsOverdraft() );
        product.allowsSweep( dto.getAllowsSweep() );
        product.baseInterestRate( dto.getBaseInterestRate() );
        product.code( dto.getCode() );
        product.currencyCode( dto.getCurrencyCode() );
        product.description( dto.getDescription() );
        product.dormancyDays( dto.getDormancyDays() );
        product.glAccountCode( dto.getGlAccountCode() );
        product.glFeeIncomeCode( dto.getGlFeeIncomeCode() );
        product.glInterestExpenseCode( dto.getGlInterestExpenseCode() );
        product.glInterestPayableCode( dto.getGlInterestPayableCode() );
        product.interestAccrualMethod( dto.getInterestAccrualMethod() );
        product.interestBearing( dto.getInterestBearing() );
        product.interestCalcMethod( dto.getInterestCalcMethod() );
        product.interestPostingFrequency( dto.getInterestPostingFrequency() );
        product.isActive( dto.getIsActive() );
        product.maxBalance( dto.getMaxBalance() );
        product.maxOverdraftLimit( dto.getMaxOverdraftLimit() );
        product.minOpeningBalance( dto.getMinOpeningBalance() );
        product.minOperatingBalance( dto.getMinOperatingBalance() );
        product.monthlyMaintenanceFee( dto.getMonthlyMaintenanceFee() );
        product.name( dto.getName() );
        product.productCategory( dto.getProductCategory() );
        product.smsAlertFee( dto.getSmsAlertFee() );

        return product.build();
    }

    @Override
    public InterestTier toInterestTierEntity(InterestTierDto dto) {
        if ( dto == null ) {
            return null;
        }

        InterestTier.InterestTierBuilder<?, ?> interestTier = InterestTier.builder();

        interestTier.effectiveFrom( dto.getEffectiveFrom() );
        interestTier.effectiveTo( dto.getEffectiveTo() );
        interestTier.interestRate( dto.getInterestRate() );
        interestTier.isActive( dto.getIsActive() );
        interestTier.maxBalance( dto.getMaxBalance() );
        interestTier.minBalance( dto.getMinBalance() );
        interestTier.tierName( dto.getTierName() );

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
