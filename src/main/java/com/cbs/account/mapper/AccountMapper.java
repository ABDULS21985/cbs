package com.cbs.account.mapper;

import com.cbs.account.dto.*;
import com.cbs.account.entity.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "customerCifNumber", source = "customer.cifNumber")
    @Mapping(target = "customerDisplayName", expression = "java(account.getCustomer().getDisplayName())")
    @Mapping(target = "productCode", source = "product.code")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "productCategory", source = "product.productCategory")
    AccountResponse toResponse(Account account);

    List<AccountResponse> toResponseList(List<Account> accounts);

    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "customerCifNumber", source = "customer.cifNumber")
    @Mapping(target = "customerDisplayName", expression = "java(signatory.getCustomer().getDisplayName())")
    SignatoryDto toSignatoryDto(AccountSignatory signatory);

    List<SignatoryDto> toSignatoryDtoList(List<AccountSignatory> signatories);

    @Mapping(target = "accountNumber", source = "account.accountNumber")
    TransactionResponse toTransactionResponse(TransactionJournal journal);

    List<TransactionResponse> toTransactionResponseList(List<TransactionJournal> journals);

    ProductDto toProductDto(Product product);

    List<ProductDto> toProductDtoList(List<Product> products);

    InterestTierDto toInterestTierDto(InterestTier tier);

    List<InterestTierDto> toInterestTierDtoList(List<InterestTier> tiers);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "interestTiers", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    Product toProductEntity(ProductDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "product", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    InterestTier toInterestTierEntity(InterestTierDto dto);
}
