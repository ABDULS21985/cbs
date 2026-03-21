package com.cbs.merchant.mapper;

import com.cbs.merchant.dto.*;
import com.cbs.merchant.entity.MerchantProfile;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface MerchantMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "merchantId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "terminalCount", ignore = true)
    @Mapping(target = "chargebackRate", ignore = true)
    @Mapping(target = "monitoringLevel", ignore = true)
    @Mapping(target = "onboardedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    MerchantProfile toEntity(OnboardMerchantRequest request);

    MerchantResponse toResponse(MerchantProfile entity);

    List<MerchantResponse> toResponseList(List<MerchantProfile> entities);
}
