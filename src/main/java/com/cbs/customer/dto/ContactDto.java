package com.cbs.customer.dto;

import com.cbs.customer.entity.ContactType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactDto {

    private Long id;

    @NotNull(message = "Contact type is required")
    private ContactType contactType;

    @NotBlank(message = "Contact value is required")
    @Size(max = 200)
    private String contactValue;

    @Size(max = 50)
    private String label;

    private Boolean isPrimary;
    private Boolean isVerified;
}
