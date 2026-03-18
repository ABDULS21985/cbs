package com.cbs.customer.mapper;

import com.cbs.customer.dto.AddressDto;
import com.cbs.customer.dto.ContactDto;
import com.cbs.customer.dto.CreateCustomerRequest;
import com.cbs.customer.dto.CustomerResponse;
import com.cbs.customer.dto.CustomerSummaryResponse;
import com.cbs.customer.dto.IdentificationDto;
import com.cbs.customer.dto.NoteDto;
import com.cbs.customer.dto.RelationshipDto;
import com.cbs.customer.dto.UpdateCustomerRequest;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerAddress;
import com.cbs.customer.entity.CustomerContact;
import com.cbs.customer.entity.CustomerIdentification;
import com.cbs.customer.entity.CustomerNote;
import com.cbs.customer.entity.CustomerRelationship;
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
public class CustomerMapperImpl implements CustomerMapper {

    @Override
    public Customer toEntity(CreateCustomerRequest request) {
        if ( request == null ) {
            return null;
        }

        Customer.CustomerBuilder<?, ?> customer = Customer.builder();

        customer.customerType( request.getCustomerType() );
        customer.title( request.getTitle() );
        customer.firstName( request.getFirstName() );
        customer.middleName( request.getMiddleName() );
        customer.lastName( request.getLastName() );
        customer.dateOfBirth( request.getDateOfBirth() );
        customer.gender( request.getGender() );
        customer.maritalStatus( request.getMaritalStatus() );
        customer.nationality( request.getNationality() );
        customer.stateOfOrigin( request.getStateOfOrigin() );
        customer.lgaOfOrigin( request.getLgaOfOrigin() );
        customer.motherMaidenName( request.getMotherMaidenName() );
        customer.registeredName( request.getRegisteredName() );
        customer.tradingName( request.getTradingName() );
        customer.registrationNumber( request.getRegistrationNumber() );
        customer.registrationDate( request.getRegistrationDate() );
        customer.industryCode( request.getIndustryCode() );
        customer.sectorCode( request.getSectorCode() );
        customer.taxId( request.getTaxId() );
        customer.email( request.getEmail() );
        customer.phonePrimary( request.getPhonePrimary() );
        customer.phoneSecondary( request.getPhoneSecondary() );
        customer.preferredLanguage( request.getPreferredLanguage() );
        customer.preferredChannel( request.getPreferredChannel() );
        customer.relationshipManager( request.getRelationshipManager() );
        customer.branchCode( request.getBranchCode() );
        customer.onboardedChannel( request.getOnboardedChannel() );
        Map<String, Object> map = request.getMetadata();
        if ( map != null ) {
            customer.metadata( new LinkedHashMap<String, Object>( map ) );
        }

        return customer.build();
    }

    @Override
    public CustomerResponse toResponse(Customer customer) {
        if ( customer == null ) {
            return null;
        }

        CustomerResponse.CustomerResponseBuilder customerResponse = CustomerResponse.builder();

        customerResponse.id( customer.getId() );
        customerResponse.cifNumber( customer.getCifNumber() );
        customerResponse.customerType( customer.getCustomerType() );
        customerResponse.status( customer.getStatus() );
        customerResponse.riskRating( customer.getRiskRating() );
        customerResponse.title( customer.getTitle() );
        customerResponse.firstName( customer.getFirstName() );
        customerResponse.middleName( customer.getMiddleName() );
        customerResponse.lastName( customer.getLastName() );
        customerResponse.dateOfBirth( customer.getDateOfBirth() );
        customerResponse.gender( customer.getGender() );
        customerResponse.maritalStatus( customer.getMaritalStatus() );
        customerResponse.nationality( customer.getNationality() );
        customerResponse.stateOfOrigin( customer.getStateOfOrigin() );
        customerResponse.lgaOfOrigin( customer.getLgaOfOrigin() );
        customerResponse.registeredName( customer.getRegisteredName() );
        customerResponse.tradingName( customer.getTradingName() );
        customerResponse.registrationNumber( customer.getRegistrationNumber() );
        customerResponse.registrationDate( customer.getRegistrationDate() );
        customerResponse.industryCode( customer.getIndustryCode() );
        customerResponse.sectorCode( customer.getSectorCode() );
        customerResponse.taxId( customer.getTaxId() );
        customerResponse.email( customer.getEmail() );
        customerResponse.phonePrimary( customer.getPhonePrimary() );
        customerResponse.phoneSecondary( customer.getPhoneSecondary() );
        customerResponse.preferredLanguage( customer.getPreferredLanguage() );
        customerResponse.preferredChannel( customer.getPreferredChannel() );
        customerResponse.relationshipManager( customer.getRelationshipManager() );
        customerResponse.branchCode( customer.getBranchCode() );
        customerResponse.onboardedChannel( customer.getOnboardedChannel() );
        customerResponse.profilePhotoUrl( customer.getProfilePhotoUrl() );
        Map<String, Object> map = customer.getMetadata();
        if ( map != null ) {
            customerResponse.metadata( new LinkedHashMap<String, Object>( map ) );
        }
        customerResponse.addresses( toAddressDtoList( customer.getAddresses() ) );
        customerResponse.identifications( toIdentificationDtoList( customer.getIdentifications() ) );
        customerResponse.contacts( toContactDtoList( customer.getContacts() ) );
        customerResponse.relationships( toRelationshipDtoList( customer.getRelationships() ) );
        customerResponse.notes( toNoteDtoList( customer.getNotes() ) );
        customerResponse.createdAt( customer.getCreatedAt() );
        customerResponse.updatedAt( customer.getUpdatedAt() );
        customerResponse.createdBy( customer.getCreatedBy() );

        customerResponse.displayName( customer.getDisplayName() );

        return customerResponse.build();
    }

    @Override
    public CustomerSummaryResponse toSummaryResponse(Customer customer) {
        if ( customer == null ) {
            return null;
        }

        CustomerSummaryResponse.CustomerSummaryResponseBuilder customerSummaryResponse = CustomerSummaryResponse.builder();

        customerSummaryResponse.id( customer.getId() );
        customerSummaryResponse.cifNumber( customer.getCifNumber() );
        customerSummaryResponse.customerType( customer.getCustomerType() );
        customerSummaryResponse.status( customer.getStatus() );
        customerSummaryResponse.riskRating( customer.getRiskRating() );
        customerSummaryResponse.email( customer.getEmail() );
        customerSummaryResponse.phonePrimary( customer.getPhonePrimary() );
        customerSummaryResponse.branchCode( customer.getBranchCode() );
        customerSummaryResponse.createdAt( customer.getCreatedAt() );

        customerSummaryResponse.displayName( customer.getDisplayName() );

        return customerSummaryResponse.build();
    }

    @Override
    public List<CustomerSummaryResponse> toSummaryResponseList(List<Customer> customers) {
        if ( customers == null ) {
            return null;
        }

        List<CustomerSummaryResponse> list = new ArrayList<CustomerSummaryResponse>( customers.size() );
        for ( Customer customer : customers ) {
            list.add( toSummaryResponse( customer ) );
        }

        return list;
    }

    @Override
    public void updateEntity(UpdateCustomerRequest request, Customer customer) {
        if ( request == null ) {
            return;
        }

        if ( request.getTitle() != null ) {
            customer.setTitle( request.getTitle() );
        }
        if ( request.getFirstName() != null ) {
            customer.setFirstName( request.getFirstName() );
        }
        if ( request.getMiddleName() != null ) {
            customer.setMiddleName( request.getMiddleName() );
        }
        if ( request.getLastName() != null ) {
            customer.setLastName( request.getLastName() );
        }
        if ( request.getDateOfBirth() != null ) {
            customer.setDateOfBirth( request.getDateOfBirth() );
        }
        if ( request.getGender() != null ) {
            customer.setGender( request.getGender() );
        }
        if ( request.getMaritalStatus() != null ) {
            customer.setMaritalStatus( request.getMaritalStatus() );
        }
        if ( request.getNationality() != null ) {
            customer.setNationality( request.getNationality() );
        }
        if ( request.getStateOfOrigin() != null ) {
            customer.setStateOfOrigin( request.getStateOfOrigin() );
        }
        if ( request.getLgaOfOrigin() != null ) {
            customer.setLgaOfOrigin( request.getLgaOfOrigin() );
        }
        if ( request.getMotherMaidenName() != null ) {
            customer.setMotherMaidenName( request.getMotherMaidenName() );
        }
        if ( request.getRegisteredName() != null ) {
            customer.setRegisteredName( request.getRegisteredName() );
        }
        if ( request.getTradingName() != null ) {
            customer.setTradingName( request.getTradingName() );
        }
        if ( request.getRegistrationNumber() != null ) {
            customer.setRegistrationNumber( request.getRegistrationNumber() );
        }
        if ( request.getRegistrationDate() != null ) {
            customer.setRegistrationDate( request.getRegistrationDate() );
        }
        if ( request.getIndustryCode() != null ) {
            customer.setIndustryCode( request.getIndustryCode() );
        }
        if ( request.getSectorCode() != null ) {
            customer.setSectorCode( request.getSectorCode() );
        }
        if ( request.getTaxId() != null ) {
            customer.setTaxId( request.getTaxId() );
        }
        if ( request.getEmail() != null ) {
            customer.setEmail( request.getEmail() );
        }
        if ( request.getPhonePrimary() != null ) {
            customer.setPhonePrimary( request.getPhonePrimary() );
        }
        if ( request.getPhoneSecondary() != null ) {
            customer.setPhoneSecondary( request.getPhoneSecondary() );
        }
        if ( request.getPreferredLanguage() != null ) {
            customer.setPreferredLanguage( request.getPreferredLanguage() );
        }
        if ( request.getPreferredChannel() != null ) {
            customer.setPreferredChannel( request.getPreferredChannel() );
        }
        if ( request.getRelationshipManager() != null ) {
            customer.setRelationshipManager( request.getRelationshipManager() );
        }
        if ( request.getBranchCode() != null ) {
            customer.setBranchCode( request.getBranchCode() );
        }
        if ( request.getProfilePhotoUrl() != null ) {
            customer.setProfilePhotoUrl( request.getProfilePhotoUrl() );
        }
        if ( customer.getMetadata() != null ) {
            Map<String, Object> map = request.getMetadata();
            if ( map != null ) {
                customer.getMetadata().clear();
                customer.getMetadata().putAll( map );
            }
        }
        else {
            Map<String, Object> map = request.getMetadata();
            if ( map != null ) {
                customer.setMetadata( new LinkedHashMap<String, Object>( map ) );
            }
        }
    }

    @Override
    public CustomerAddress toAddressEntity(AddressDto dto) {
        if ( dto == null ) {
            return null;
        }

        CustomerAddress.CustomerAddressBuilder<?, ?> customerAddress = CustomerAddress.builder();

        customerAddress.id( dto.getId() );
        customerAddress.addressType( dto.getAddressType() );
        customerAddress.addressLine1( dto.getAddressLine1() );
        customerAddress.addressLine2( dto.getAddressLine2() );
        customerAddress.city( dto.getCity() );
        customerAddress.state( dto.getState() );
        customerAddress.country( dto.getCountry() );
        customerAddress.postalCode( dto.getPostalCode() );
        customerAddress.district( dto.getDistrict() );
        customerAddress.landmark( dto.getLandmark() );
        customerAddress.isPrimary( dto.getIsPrimary() );
        customerAddress.isVerified( dto.getIsVerified() );
        customerAddress.verifiedAt( dto.getVerifiedAt() );
        customerAddress.latitude( dto.getLatitude() );
        customerAddress.longitude( dto.getLongitude() );

        return customerAddress.build();
    }

    @Override
    public AddressDto toAddressDto(CustomerAddress entity) {
        if ( entity == null ) {
            return null;
        }

        AddressDto.AddressDtoBuilder addressDto = AddressDto.builder();

        addressDto.id( entity.getId() );
        addressDto.addressType( entity.getAddressType() );
        addressDto.addressLine1( entity.getAddressLine1() );
        addressDto.addressLine2( entity.getAddressLine2() );
        addressDto.city( entity.getCity() );
        addressDto.state( entity.getState() );
        addressDto.country( entity.getCountry() );
        addressDto.postalCode( entity.getPostalCode() );
        addressDto.district( entity.getDistrict() );
        addressDto.landmark( entity.getLandmark() );
        addressDto.isPrimary( entity.getIsPrimary() );
        addressDto.isVerified( entity.getIsVerified() );
        addressDto.verifiedAt( entity.getVerifiedAt() );
        addressDto.latitude( entity.getLatitude() );
        addressDto.longitude( entity.getLongitude() );

        return addressDto.build();
    }

    @Override
    public List<AddressDto> toAddressDtoList(List<CustomerAddress> entities) {
        if ( entities == null ) {
            return null;
        }

        List<AddressDto> list = new ArrayList<AddressDto>( entities.size() );
        for ( CustomerAddress customerAddress : entities ) {
            list.add( toAddressDto( customerAddress ) );
        }

        return list;
    }

    @Override
    public CustomerIdentification toIdentificationEntity(IdentificationDto dto) {
        if ( dto == null ) {
            return null;
        }

        CustomerIdentification.CustomerIdentificationBuilder<?, ?> customerIdentification = CustomerIdentification.builder();

        customerIdentification.id( dto.getId() );
        customerIdentification.idType( dto.getIdType() );
        customerIdentification.idNumber( dto.getIdNumber() );
        customerIdentification.issueDate( dto.getIssueDate() );
        customerIdentification.expiryDate( dto.getExpiryDate() );
        customerIdentification.issuingAuthority( dto.getIssuingAuthority() );
        customerIdentification.issuingCountry( dto.getIssuingCountry() );
        customerIdentification.isPrimary( dto.getIsPrimary() );
        customerIdentification.isVerified( dto.getIsVerified() );
        customerIdentification.verifiedAt( dto.getVerifiedAt() );
        customerIdentification.documentUrl( dto.getDocumentUrl() );

        return customerIdentification.build();
    }

    @Override
    public IdentificationDto toIdentificationDto(CustomerIdentification entity) {
        if ( entity == null ) {
            return null;
        }

        IdentificationDto.IdentificationDtoBuilder identificationDto = IdentificationDto.builder();

        identificationDto.id( entity.getId() );
        identificationDto.idType( entity.getIdType() );
        identificationDto.idNumber( entity.getIdNumber() );
        identificationDto.issueDate( entity.getIssueDate() );
        identificationDto.expiryDate( entity.getExpiryDate() );
        identificationDto.issuingAuthority( entity.getIssuingAuthority() );
        identificationDto.issuingCountry( entity.getIssuingCountry() );
        identificationDto.isPrimary( entity.getIsPrimary() );
        identificationDto.isVerified( entity.getIsVerified() );
        identificationDto.verifiedAt( entity.getVerifiedAt() );
        identificationDto.documentUrl( entity.getDocumentUrl() );

        identificationDto.expired( entity.isExpired() );

        return identificationDto.build();
    }

    @Override
    public List<IdentificationDto> toIdentificationDtoList(List<CustomerIdentification> entities) {
        if ( entities == null ) {
            return null;
        }

        List<IdentificationDto> list = new ArrayList<IdentificationDto>( entities.size() );
        for ( CustomerIdentification customerIdentification : entities ) {
            list.add( toIdentificationDto( customerIdentification ) );
        }

        return list;
    }

    @Override
    public CustomerContact toContactEntity(ContactDto dto) {
        if ( dto == null ) {
            return null;
        }

        CustomerContact.CustomerContactBuilder<?, ?> customerContact = CustomerContact.builder();

        customerContact.id( dto.getId() );
        customerContact.contactType( dto.getContactType() );
        customerContact.contactValue( dto.getContactValue() );
        customerContact.label( dto.getLabel() );
        customerContact.isPrimary( dto.getIsPrimary() );
        customerContact.isVerified( dto.getIsVerified() );

        return customerContact.build();
    }

    @Override
    public ContactDto toContactDto(CustomerContact entity) {
        if ( entity == null ) {
            return null;
        }

        ContactDto.ContactDtoBuilder contactDto = ContactDto.builder();

        contactDto.id( entity.getId() );
        contactDto.contactType( entity.getContactType() );
        contactDto.contactValue( entity.getContactValue() );
        contactDto.label( entity.getLabel() );
        contactDto.isPrimary( entity.getIsPrimary() );
        contactDto.isVerified( entity.getIsVerified() );

        return contactDto.build();
    }

    @Override
    public List<ContactDto> toContactDtoList(List<CustomerContact> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ContactDto> list = new ArrayList<ContactDto>( entities.size() );
        for ( CustomerContact customerContact : entities ) {
            list.add( toContactDto( customerContact ) );
        }

        return list;
    }

    @Override
    public RelationshipDto toRelationshipDto(CustomerRelationship entity) {
        if ( entity == null ) {
            return null;
        }

        RelationshipDto.RelationshipDtoBuilder relationshipDto = RelationshipDto.builder();

        relationshipDto.customerId( entityCustomerId( entity ) );
        relationshipDto.customerCifNumber( entityCustomerCifNumber( entity ) );
        relationshipDto.relatedCustomerId( entityRelatedCustomerId( entity ) );
        relationshipDto.relatedCustomerCifNumber( entityRelatedCustomerCifNumber( entity ) );
        relationshipDto.id( entity.getId() );
        relationshipDto.relationshipType( entity.getRelationshipType() );
        relationshipDto.ownershipPercentage( entity.getOwnershipPercentage() );
        relationshipDto.isActive( entity.getIsActive() );
        relationshipDto.notes( entity.getNotes() );
        relationshipDto.effectiveFrom( entity.getEffectiveFrom() );
        relationshipDto.effectiveTo( entity.getEffectiveTo() );

        relationshipDto.customerDisplayName( entity.getCustomer().getDisplayName() );
        relationshipDto.relatedCustomerDisplayName( entity.getRelatedCustomer().getDisplayName() );

        return relationshipDto.build();
    }

    @Override
    public List<RelationshipDto> toRelationshipDtoList(List<CustomerRelationship> entities) {
        if ( entities == null ) {
            return null;
        }

        List<RelationshipDto> list = new ArrayList<RelationshipDto>( entities.size() );
        for ( CustomerRelationship customerRelationship : entities ) {
            list.add( toRelationshipDto( customerRelationship ) );
        }

        return list;
    }

    @Override
    public CustomerNote toNoteEntity(NoteDto dto) {
        if ( dto == null ) {
            return null;
        }

        CustomerNote.CustomerNoteBuilder<?, ?> customerNote = CustomerNote.builder();

        customerNote.id( dto.getId() );
        customerNote.noteType( dto.getNoteType() );
        customerNote.subject( dto.getSubject() );
        customerNote.content( dto.getContent() );
        customerNote.isPinned( dto.getIsPinned() );

        return customerNote.build();
    }

    @Override
    public NoteDto toNoteDto(CustomerNote entity) {
        if ( entity == null ) {
            return null;
        }

        NoteDto.NoteDtoBuilder noteDto = NoteDto.builder();

        noteDto.createdAt( entity.getCreatedAt() );
        noteDto.createdBy( entity.getCreatedBy() );
        noteDto.id( entity.getId() );
        noteDto.noteType( entity.getNoteType() );
        noteDto.subject( entity.getSubject() );
        noteDto.content( entity.getContent() );
        noteDto.isPinned( entity.getIsPinned() );

        return noteDto.build();
    }

    @Override
    public List<NoteDto> toNoteDtoList(List<CustomerNote> entities) {
        if ( entities == null ) {
            return null;
        }

        List<NoteDto> list = new ArrayList<NoteDto>( entities.size() );
        for ( CustomerNote customerNote : entities ) {
            list.add( toNoteDto( customerNote ) );
        }

        return list;
    }

    private Long entityCustomerId(CustomerRelationship customerRelationship) {
        Customer customer = customerRelationship.getCustomer();
        if ( customer == null ) {
            return null;
        }
        return customer.getId();
    }

    private String entityCustomerCifNumber(CustomerRelationship customerRelationship) {
        Customer customer = customerRelationship.getCustomer();
        if ( customer == null ) {
            return null;
        }
        return customer.getCifNumber();
    }

    private Long entityRelatedCustomerId(CustomerRelationship customerRelationship) {
        Customer relatedCustomer = customerRelationship.getRelatedCustomer();
        if ( relatedCustomer == null ) {
            return null;
        }
        return relatedCustomer.getId();
    }

    private String entityRelatedCustomerCifNumber(CustomerRelationship customerRelationship) {
        Customer relatedCustomer = customerRelationship.getRelatedCustomer();
        if ( relatedCustomer == null ) {
            return null;
        }
        return relatedCustomer.getCifNumber();
    }
}
