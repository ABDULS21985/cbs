package com.cbs.wadiah.dto;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateWadiahStatementConfigRequest {

    private WadiahDomainEnums.PreferredLanguage language;
    private Boolean includeHibahDisclaimer;
    private Boolean includeZakatSummary;
    private Boolean includeIslamicDates;
    private Boolean showAverageBalance;
    private WadiahDomainEnums.StatementDeliveryMethod deliveryMethod;
}
