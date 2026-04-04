package com.cbs.productfactory.islamic.dto;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicProductSearchCriteria {

    private String query;
    private Long contractTypeId;
    private IslamicDomainEnums.IslamicProductCategory productCategory;
    private IslamicDomainEnums.IslamicProductStatus status;
    private IslamicDomainEnums.ShariahComplianceStatus complianceStatus;
    private String country;
}