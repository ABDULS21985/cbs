package com.cbs.notification.dto;

import com.cbs.notification.entity.TerminologyStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTerminologyRequest {
    private String conventionalTerm;
    private String islamicTermEn;
    private String islamicTermAr;
    private String context;
    private TerminologyStatus status;
}
