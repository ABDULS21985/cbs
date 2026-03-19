package com.cbs.customer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerCountResponse {

    private long total;
    private long active;
    private long dormant;
    private long suspended;
    private long closed;
    private long newMtd;
}
