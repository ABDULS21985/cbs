package com.cbs.customer.dto;

import com.cbs.customer.entity.CustomerStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerStatusChangeRequest {

    @NotNull(message = "New status is required")
    private CustomerStatus newStatus;

    @NotNull(message = "Reason is required for status changes")
    @Size(min = 5, max = 500, message = "Reason must be between 5 and 500 characters")
    private String reason;
}
