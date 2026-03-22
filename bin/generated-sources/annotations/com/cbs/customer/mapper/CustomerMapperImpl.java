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
    date = "2026-03-22T03:27:15+0100",
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

        customer.branchCode( request.getBranchCode() );
        customer.customerType( request.getCustomerType() );
        customer.dateOfBirth( request.getDateOfBirth() );
        customer.email( request.getEmail() );
        customer.firstName( request.getFirstName() );
        customer.gender( request.getGender() );
        customer.industryCode( request.getIndustryCode() );
        customer.lastName( request.getLastName() );
        customer.lgaOfOrigin( request.getLgaOfOrigin() );
        customer.maritalStatus( request.getMaritalStatus() );
        Map<String, Object> map = request.getMetadata();
        if ( map != null ) {
            customer.metadata( new LinkedHashMap<String, Object>( map ) );
        }
        customer.middleName( request.getMiddleName() );
        customer.motherMaidenName( request.getMotherMaidenName() );
        customer.nationality( request.getNationality() );
        customer.onboardedChannel( request.getOnboardedChannel() );
        customer.phonePrimary( request.getPhonePrimary() );
        customer.phoneSecondary( request.getPhoneSecondary() );
        customer.preferredChannel( request.getPreferredChannel() );
        customer.preferredLanguage( request.getPreferredLanguage() );
        customer.registeredName( request.getRegisteredName() );
        customer.registrationDate( request.getRegistrationDate() );
        customer.registrationNumber( request.getRegistrationNumber() );
        customer.relationshipManager( request.getRelationshipManager() );
        customer.sectorCode( request.getSectorCode() );
        customer.stateOfOrigin( request.getStateOfOrigin() );
        customer.taxId( request.getTaxId() );
        customer.title( request.getTitle() );
        customer.tradingName( request.getTradingName() );

        return customer.build();
    }

    @Override
    public CustomerResponse toResponse(Customer customer) {
        if ( customer == null ) {
            return null;
        }

        CustomerResponse.CustomerResponseBuilder customerResponse = CustomerResponse.builder();

        customerResponse.addresses( toAddressDtoList( customer.getAddresses() ) );
        customerResponse.branchCode( customer.getBranchCode() );
        customerResponse.cifNumber( customer.getCifNumber() );
        customerResponse.contacts( toContactDtoList( customer.getContacts() ) );
        customerResponse.createdAt( customer.getCreatedAt() );
        customerResponse.createdBy( customer.getCreatedBy() );
        customerResponse.customerType( customer.getCustomerType() );
        customerResponse.dateOfBirth( customer.getDateOfBirth() );
        customerResponse.email( customer.getEmail() );
        customerResponse.firstName( customer.getFirstName() );
        customerResponse.gender( customer.getGender() );
        customerResponse.id( customer.getId() );
        customerResponse.identifications( toIdentificationDtoList( customer.getIdentifications() ) );
        customerResponse.industryCode( customer.getIndustryCode() );
        customerResponse.lastName( customer.getLastName() );
        customerResponse.lgaOfOrigin( customer.getLgaOfOrigin() );
        customerResponse.maritalStatus( customer.getMaritalStatus() );
        Map<String, Object> map = customer.getMetadata();
        if ( map != null ) {
            customerResponse.metadata( new LinkedHashMap<String, Object>( map ) );
        }
        customerResponse.middleName( customer.getMiddleName() );
        customerResponse.nationality( customer.getNationality() );
        customerResponse.notes( toNoteDtoList( customer.getNotes() ) );
        customerResponse.onboardedChannel( customer.getOnboardedChannel() );
        customerResponse.phonePrimary( customer.getPhonePrimary() );
        customerResponse.phoneSecondary( customer.getPhoneSecondary() );
        customerResponse.preferredChannel( customer.getPreferredChannel() );
        customerResponse.preferredLanguage( customer.getPreferredLanguage() );
        customerResponse.profilePhotoUrl( customer.getProfilePhotoUrl() );
        customerResponse.registeredName( customer.getRegisteredName() );
        customerResponse.registrationDate( customer.getRegistrationDate() );
        customerResponse.registrationNumber( customer.getRegistrationNumber() );
        customerResponse.relationshipManager( customer.getRelationshipManager() );
        customerResponse.relationships( toRelationshipDtoList( customer.getRelationships() ) );
        customerResponse.riskRating( customer.getRiskRating() );
        customerResponse.sectorCode( customer.getSectorCode() );
        customerResponse.stateOfOrigin( customer.getStateOfOrigin() );
        customerResponse.status( customer.getStatus() );
        customerResponse.taxId( customer.getTaxId() );
        customerResponse.title( customer.getTitle() );
        customerResponse.tradingName( customer.getTradingName() );
        customerResponse.updatedAt( customer.getUpdatedAt() );

        customerResponse.displayName( customer.getDisplayName() );

        return customerResponse.build();
    }

    @Override
    public CustomerSummaryResponse toSummaryResponse(Customer customer) {
        if ( customer == null ) {
            return null;
        }

        CustomerSummaryResponse.CustomerSummaryResponseBuilder customerSummaryResponse = CustomerSummaryResponse.builder();

        customerSummaryResponse.branchCode( customer.getBranchCode() );
        customerSummaryResponse.cifNumber( customer.getCifNumber() );
        customerSummaryResponse.createdAt( customer.getCreatedAt() );
        customerSummaryResponse.customerType( customer.getCustomerType() );
        customerSummaryResponse.email( customer.getEmail() );
        customerSummaryResponse.id( customer.getId() );
        customerSummaryResponse.phonePrimary( customer.getPhonePrimary() );
        customerSummaryResponse.riskRating( customer.getRiskRating() );
        customerSummaryResponse.status( customer.getStatus() );

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

        if ( request.getBranchCode() != null ) {
            customer.setBranchCode( request.getBranchCode() );
        }
        if ( request.getDateOfBirth() != null ) {
            customer.setDateOfBirth( request.getDateOfBirth() );
        }
        if ( request.getEmail() != null ) {
            customer.setEmail( request.getEmail() );
        }
        if ( request.getFirstName() != null ) {
            customer.setFirstName( request.getFirstName() );
        }
        if ( request.getGender() != null ) {
            customer.setGender( request.getGender() );
        }
        if ( request.getIndustryCode() != null ) {
            customer.setIndustryCode( request.getIndustryCode() );
        }
        if ( request.getLastName() != null ) {
            customer.setLastName( request.getLastName() );
        }
        if ( request.getLgaOfOrigin() != null ) {
            customer.setLgaOfOrigin( request.getLgaOfOrigin() );
        }
        if ( request.getMaritalStatus() != null ) {
            customer.setMaritalStatus( request.getMaritalStatus() );
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
        if ( request.getMiddleName() != null ) {
            customer.setMiddleName( request.getMiddleName() );
        }
        if ( request.getMotherMaidenName() != null ) {
            customer.setMotherMaidenName( request.getMotherMaidenName() );
        }
        if ( request.getNationality() != null ) {
            customer.setNationality( request.getNationality() );
        }
        if ( request.getPhonePrimary() != null ) {
            customer.setPhonePrimary( request.getPhonePrimary() );
        }
        if ( request.getPhoneSecondary() != null ) {
            customer.setPhoneSecondary( request.getPhoneSecondary() );
        }
        if ( request.getPreferredChannel() != null ) {
            customer.setPreferredChannel( request.getPreferredChannel() );
        }
        if ( request.getPreferredLanguage() != null ) {
            customer.setPreferredLanguage( request.getPreferredLanguage() );
        }
        if ( request.getProfilePhotoUrl() != null ) {
            customer.setProfilePhotoUrl( request.getProfilePhotoUrl() );
        }
        if ( request.getRegisteredName() != null ) {
            customer.setRegisteredName( request.getRegisteredName() );
        }
        if ( request.getRegistrationDate() != null ) {
            customer.setRegistrationDate( request.getRegistrationDate() );
        }
        if ( request.getRegistrationNumber() != null ) {
            customer.setRegistrationNumber( request.getRegistrationNumber() );
        }
        if ( request.getRelationshipManager() != null ) {
            customer.setRelationshipManager( request.getRelationshipManager() );
        }
        if ( request.getSectorCode() != null ) {
            customer.setSectorCode( request.getSectorCode() );
        }
        if ( request.getStateOfOrigin() != null ) {
            customer.setStateOfOrigin( request.getStateOfOrigin() );
        }
        if ( request.getTaxId() != null ) {
            customer.setTaxId( request.getTaxId() );
        }
        if ( request.getTitle() != null ) {
            customer.setTitle( request.getTitle() );
        }
        if ( request.getTradingName() != null ) {
            customer.setTradingName( request.getTradingName() );
        }
    }

    @Override
    public CustomerAddress toAddressEntity(AddressDto dto) {
        if ( dto == null ) {
            return null;
        }

        CustomerAddress.CustomerAddressBuilder<?, ?> customerAddress = CustomerAddress.builder();

        customerAddress.addressLine1( dto.getAddressLine1() );
        customerAddress.addressLine2( dto.getAddressLine2() );
        customerAddress.addressType( dto.getAddressType() );
        customerAddress.city( dto.getCity() );
        customerAddress.country( dto.getCountry() );
        customerAddress.district( dto.getDistrict() );
        customerAddress.id( dto.getId() );
        customerAddress.isPrimary( dto.getIsPrimary() );
        customerAddress.isVerified( dto.getIsVerified() );
        customerAddress.landmark( dto.getLandmark() );
        customerAddress.latitude( dto.getLatitude() );
        customerAddress.longitude( dto.getLongitude() );
        customerAddress.postalCode( dto.getPostalCode() );
        customerAddress.state( dto.getState() );
        customerAddress.verifiedAt( dto.getVerifiedAt() );

        return customerAddress.build();
    }

    @Override
    public AddressDto toAddressDto(CustomerAddress entity) {
        if ( entity == null ) {
            return null;
        }

        AddressDto.AddressDtoBuilder addressDto = AddressDto.builder();

        addressDto.addressLine1( entity.getAddressLine1() );
        addressDto.addressLine2( entity.getAddressLine2() );
        addressDto.addressType( entity.getAddressType() );
        addressDto.city( entity.getCity() );
        addressDto.country( entity.getCountry() );
        addressDto.district( entity.getDistrict() );
        addressDto.id( entity.getId() );
        addressDto.isPrimary( entity.getIsPrimary() );
        addressDto.isVerified( entity.getIsVerified() );
        addressDto.landmark( entity.getLandmark() );
        addressDto.latitude( entity.getLatitude() );
        addressDto.longitude( entity.getLongitude() );
        addressDto.postalCode( entity.getPostalCode() );
        addressDto.state( entity.getState() );
        addressDto.verifiedAt( entity.getVerifiedAt() );

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

        customerIdentification.documentUrl( dto.getDocumentUrl() );
        customerIdentification.expiryDate( dto.getExpiryDate() );
        customerIdentification.id( dto.getId() );
        customerIdentification.idNumber( dto.getIdNumber() );
        customerIdentification.idType( dto.getIdType() );
        customerIdentification.isPrimary( dto.getIsPrimary() );
        customerIdentification.isVerified( dto.getIsVerified() );
        customerIdentification.issueDate( dto.getIssueDate() );
        customerIdentification.issuingAuthority( dto.getIssuingAuthority() );
        customerIdentification.issuingCountry( dto.getIssuingCountry() );
        customerIdentification.verifiedAt( dto.getVerifiedAt() );

        return customerIdentification.build();
    }

    @Override
    public IdentificationDto toIdentificationDto(CustomerIdentification entity) {
        if ( entity == null ) {
            return null;
        }

        IdentificationDto.IdentificationDtoBuilder identificationDto = IdentificationDto.builder();

        identificationDto.documentUrl( entity.getDocumentUrl() );
        identificationDto.expiryDate( entity.getExpiryDate() );
        identificationDto.id( entity.getId() );
        identificationDto.idNumber( entity.getIdNumber() );
        identificationDto.idType( entity.getIdType() );
        identificationDto.isPrimary( entity.getIsPrimary() );
        identificationDto.isVerified( entity.getIsVerified() );
        identificationDto.issueDate( entity.getIssueDate() );
        identificationDto.issuingAuthority( entity.getIssuingAuthority() );
        identificationDto.issuingCountry( entity.getIssuingCountry() );
        identificationDto.verifiedAt( entity.getVerifiedAt() );

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

        customerContact.contactType( dto.getContactType() );
        customerContact.contactValue( dto.getContactValue() );
        customerContact.id( dto.getId() );
        customerContact.isPrimary( dto.getIsPrimary() );
        customerContact.isVerified( dto.getIsVerified() );
        customerContact.label( dto.getLabel() );

        return customerContact.build();
    }

    @Override
    public ContactDto toContactDto(CustomerContact entity) {
        if ( entity == null ) {
            return null;
        }

        ContactDto.ContactDtoBuilder contactDto = ContactDto.builder();

        contactDto.contactType( entity.getContactType() );
        contactDto.contactValue( entity.getContactValue() );
        contactDto.id( entity.getId() );
        contactDto.isPrimary( entity.getIsPrimary() );
        contactDto.isVerified( entity.getIsVerified() );
        contactDto.label( entity.getLabel() );

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
        relationshipDto.effectiveFrom( entity.getEffectiveFrom() );
        relationshipDto.effectiveTo( entity.getEffectiveTo() );
        relationshipDto.id( entity.getId() );
        relationshipDto.isActive( entity.getIsActive() );
        relationshipDto.notes( entity.getNotes() );
        relationshipDto.ownershipPercentage( entity.getOwnershipPercentage() );
        relationshipDto.relationshipType( entity.getRelationshipType() );

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

        customerNote.content( dto.getContent() );
        customerNote.id( dto.getId() );
        customerNote.isPinned( dto.getIsPinned() );
        customerNote.noteType( dto.getNoteType() );
        customerNote.subject( dto.getSubject() );

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
        noteDto.content( entity.getContent() );
        noteDto.id( entity.getId() );
        noteDto.isPinned( entity.getIsPinned() );
        noteDto.noteType( entity.getNoteType() );
        noteDto.subject( entity.getSubject() );

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
