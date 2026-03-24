package com.cbs.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillFavoriteDto {

    private Long id;
    private String billerName;
    private String billerCode;
    private String categoryCode;
    private String billerCustomerId;
    private String alias;
    private Map<String, String> fields;
    private BigDecimal lastPaidAmount;
    private Instant lastPaidAt;
    private Integer paymentCount;
}
