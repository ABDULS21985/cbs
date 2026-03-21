package com.cbs.merchant.mapper;

import com.cbs.merchant.dto.MerchantResponse;
import com.cbs.merchant.dto.OnboardMerchantRequest;
import com.cbs.merchant.entity.MerchantProfile;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-21T22:35:42+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class MerchantMapperImpl implements MerchantMapper {

    @Override
    public MerchantProfile toEntity(OnboardMerchantRequest request) {
        if ( request == null ) {
            return null;
        }

        MerchantProfile.MerchantProfileBuilder merchantProfile = MerchantProfile.builder();

        merchantProfile.merchantName( request.getMerchantName() );
        merchantProfile.tradingName( request.getTradingName() );
        merchantProfile.merchantCategoryCode( request.getMerchantCategoryCode() );
        merchantProfile.businessType( request.getBusinessType() );
        merchantProfile.registrationNumber( request.getRegistrationNumber() );
        merchantProfile.taxId( request.getTaxId() );
        merchantProfile.contactName( request.getContactName() );
        merchantProfile.contactPhone( request.getContactPhone() );
        merchantProfile.contactEmail( request.getContactEmail() );
        merchantProfile.address( request.getAddress() );
        merchantProfile.settlementAccountId( request.getSettlementAccountId() );
        merchantProfile.settlementFrequency( request.getSettlementFrequency() );
        merchantProfile.mdrRate( request.getMdrRate() );
        merchantProfile.monthlyVolumeLimit( request.getMonthlyVolumeLimit() );
        merchantProfile.riskCategory( request.getRiskCategory() );

        return merchantProfile.build();
    }

    @Override
    public MerchantResponse toResponse(MerchantProfile entity) {
        if ( entity == null ) {
            return null;
        }

        MerchantResponse.MerchantResponseBuilder merchantResponse = MerchantResponse.builder();

        merchantResponse.id( entity.getId() );
        merchantResponse.merchantId( entity.getMerchantId() );
        merchantResponse.merchantName( entity.getMerchantName() );
        merchantResponse.tradingName( entity.getTradingName() );
        merchantResponse.merchantCategoryCode( entity.getMerchantCategoryCode() );
        merchantResponse.businessType( entity.getBusinessType() );
        merchantResponse.registrationNumber( entity.getRegistrationNumber() );
        merchantResponse.taxId( entity.getTaxId() );
        merchantResponse.contactName( entity.getContactName() );
        merchantResponse.contactPhone( entity.getContactPhone() );
        merchantResponse.contactEmail( entity.getContactEmail() );
        merchantResponse.address( entity.getAddress() );
        merchantResponse.settlementAccountId( entity.getSettlementAccountId() );
        merchantResponse.settlementFrequency( entity.getSettlementFrequency() );
        merchantResponse.mdrRate( entity.getMdrRate() );
        merchantResponse.terminalCount( entity.getTerminalCount() );
        merchantResponse.monthlyVolumeLimit( entity.getMonthlyVolumeLimit() );
        merchantResponse.riskCategory( entity.getRiskCategory() );
        merchantResponse.chargebackRate( entity.getChargebackRate() );
        merchantResponse.monitoringLevel( entity.getMonitoringLevel() );
        merchantResponse.status( entity.getStatus() );
        merchantResponse.onboardedAt( entity.getOnboardedAt() );
        merchantResponse.createdAt( entity.getCreatedAt() );
        merchantResponse.updatedAt( entity.getUpdatedAt() );

        return merchantResponse.build();
    }

    @Override
    public List<MerchantResponse> toResponseList(List<MerchantProfile> entities) {
        if ( entities == null ) {
            return null;
        }

        List<MerchantResponse> list = new ArrayList<MerchantResponse>( entities.size() );
        for ( MerchantProfile merchantProfile : entities ) {
            list.add( toResponse( merchantProfile ) );
        }

        return list;
    }
}
