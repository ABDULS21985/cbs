package com.cbs.wadiah.dto;

import jakarta.validation.constraints.AssertTrue;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcceptShariahDisclosureRequest {

    @AssertTrue
    private boolean shariahDisclosureAccepted;

    @AssertTrue
    private boolean hibahNonGuaranteeAcknowledged;

    @AssertTrue
    private boolean zakatObligationAcknowledged;
}
