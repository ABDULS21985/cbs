package com.cbs.customer.mapper;

import com.cbs.customer.dto.*;
import com.cbs.customer.entity.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CustomerMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cifNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "riskRating", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    @Mapping(target = "identifications", ignore = true)
    @Mapping(target = "contacts", ignore = true)
    @Mapping(target = "notes", ignore = true)
    @Mapping(target = "relationships", ignore = true)
    @Mapping(target = "profilePhotoUrl", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    Customer toEntity(CreateCustomerRequest request);

    @Mapping(target = "displayName", expression = "java(customer.getDisplayName())")
    CustomerResponse toResponse(Customer customer);

    @Mapping(target = "displayName", expression = "java(customer.getDisplayName())")
    CustomerSummaryResponse toSummaryResponse(Customer customer);

    List<CustomerSummaryResponse> toSummaryResponseList(List<Customer> customers);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cifNumber", ignore = true)
    @Mapping(target = "customerType", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "riskRating", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    @Mapping(target = "identifications", ignore = true)
    @Mapping(target = "contacts", ignore = true)
    @Mapping(target = "notes", ignore = true)
    @Mapping(target = "relationships", ignore = true)
    @Mapping(target = "onboardedChannel", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateEntity(UpdateCustomerRequest request, @MappingTarget Customer customer);

    // Address mappings
    @Mapping(target = "customer", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    CustomerAddress toAddressEntity(AddressDto dto);

    AddressDto toAddressDto(CustomerAddress entity);

    List<AddressDto> toAddressDtoList(List<CustomerAddress> entities);

    // Identification mappings
    @Mapping(target = "customer", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    CustomerIdentification toIdentificationEntity(IdentificationDto dto);

    @Mapping(target = "expired", expression = "java(entity.isExpired())")
    IdentificationDto toIdentificationDto(CustomerIdentification entity);

    List<IdentificationDto> toIdentificationDtoList(List<CustomerIdentification> entities);

    // Contact mappings
    @Mapping(target = "customer", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    CustomerContact toContactEntity(ContactDto dto);

    ContactDto toContactDto(CustomerContact entity);

    List<ContactDto> toContactDtoList(List<CustomerContact> entities);

    // Relationship mappings
    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "customerCifNumber", source = "customer.cifNumber")
    @Mapping(target = "customerDisplayName", expression = "java(entity.getCustomer().getDisplayName())")
    @Mapping(target = "relatedCustomerId", source = "relatedCustomer.id")
    @Mapping(target = "relatedCustomerCifNumber", source = "relatedCustomer.cifNumber")
    @Mapping(target = "relatedCustomerDisplayName", expression = "java(entity.getRelatedCustomer().getDisplayName())")
    RelationshipDto toRelationshipDto(CustomerRelationship entity);

    List<RelationshipDto> toRelationshipDtoList(List<CustomerRelationship> entities);

    // Note mappings
    @Mapping(target = "customer", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    CustomerNote toNoteEntity(NoteDto dto);

    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "createdBy", source = "createdBy")
    NoteDto toNoteDto(CustomerNote entity);

    List<NoteDto> toNoteDtoList(List<CustomerNote> entities);
}
