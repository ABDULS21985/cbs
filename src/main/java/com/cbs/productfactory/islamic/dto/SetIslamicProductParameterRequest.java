package com.cbs.productfactory.islamic.dto;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SetIslamicProductParameterRequest {

    private String parameterName;
    private String parameterValue;
    private IslamicDomainEnums.ParameterType parameterType;
    private String description;
    private String descriptionAr;
    private Boolean editable;
    private String validationRule;
}