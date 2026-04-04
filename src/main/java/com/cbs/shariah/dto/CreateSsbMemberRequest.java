package com.cbs.shariah.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateSsbMemberRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 150)
    private String fullName;

    @Size(max = 80)
    private String title;

    private List<String> qualifications;

    private List<String> specializations;

    @NotNull(message = "Appointment date is required")
    private LocalDate appointmentDate;

    private LocalDate expiryDate;

    private Boolean isChairman;

    @Min(value = 1, message = "Voting weight must be at least 1")
    private Integer votingWeight;

    @Email(message = "Invalid email format")
    @Size(max = 150)
    private String contactEmail;

    @Size(max = 30)
    private String contactPhone;

    @Size(max = 60)
    private String nationality;

    @JsonIgnore
    @AssertTrue(message = "Appointment date must be before expiry date")
    public boolean isAppointmentWindowValid() {
        return expiryDate == null || appointmentDate == null || appointmentDate.isBefore(expiryDate);
    }
}
