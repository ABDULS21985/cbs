package com.cbs.customer.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "customer", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cif_number", nullable = false, unique = true, length = 20)
    private String cifNumber;

    @Column(name = "customer_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CustomerType customerType;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Column(name = "risk_rating", length = 10)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RiskRating riskRating = RiskRating.MEDIUM;

    // Individual fields
    @Column(name = "title", length = 20)
    private String title;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "middle_name", length = 100)
    private String middleName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "marital_status", length = 20)
    private String maritalStatus;

    @Column(name = "nationality", length = 3)
    private String nationality;

    @Column(name = "state_of_origin", length = 50)
    private String stateOfOrigin;

    @Column(name = "lga_of_origin", length = 100)
    private String lgaOfOrigin;

    @Column(name = "mother_maiden_name", length = 100)
    private String motherMaidenName;

    // Corporate/SME fields
    @Column(name = "registered_name", length = 255)
    private String registeredName;

    @Column(name = "trading_name", length = 255)
    private String tradingName;

    @Column(name = "registration_number", length = 50)
    private String registrationNumber;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

    @Column(name = "industry_code", length = 20)
    private String industryCode;

    @Column(name = "sector_code", length = 20)
    private String sectorCode;

    // Common fields
    @Column(name = "tax_id", length = 30)
    private String taxId;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "phone_primary", length = 20)
    private String phonePrimary;

    @Column(name = "phone_secondary", length = 20)
    private String phoneSecondary;

    @Column(name = "preferred_language", length = 10)
    @Builder.Default
    private String preferredLanguage = "en";

    @Column(name = "preferred_channel", length = 20)
    @Builder.Default
    private String preferredChannel = "MOBILE";

    @Column(name = "relationship_manager", length = 100)
    private String relationshipManager;

    @Column(name = "branch_code", length = 10)
    private String branchCode;

    @Column(name = "onboarded_channel", length = 30)
    private String onboardedChannel;

    @Column(name = "profile_photo_url", length = 500)
    private String profilePhotoUrl;

    @Column(name = "country_of_residence", length = 3)
    private String countryOfResidence;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    // Relationships
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CustomerAddress> addresses = new ArrayList<>();

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CustomerIdentification> identifications = new ArrayList<>();

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CustomerContact> contacts = new ArrayList<>();

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CustomerNote> notes = new ArrayList<>();

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CustomerRelationship> relationships = new ArrayList<>();

    // Helper methods
    public void addAddress(CustomerAddress address) {
        addresses.add(address);
        address.setCustomer(this);
    }

    public void addIdentification(CustomerIdentification identification) {
        identifications.add(identification);
        identification.setCustomer(this);
    }

    public void addContact(CustomerContact contact) {
        contacts.add(contact);
        contact.setCustomer(this);
    }

    public void addNote(CustomerNote note) {
        notes.add(note);
        note.setCustomer(this);
    }

    public String getDisplayName() {
        if (customerType == CustomerType.INDIVIDUAL) {
            StringBuilder sb = new StringBuilder();
            if (title != null) sb.append(title).append(" ");
            if (firstName != null) sb.append(firstName).append(" ");
            if (lastName != null) sb.append(lastName);
            return sb.toString().trim();
        }
        return registeredName != null ? registeredName : tradingName;
    }

    public boolean isIndividual() {
        return customerType == CustomerType.INDIVIDUAL || customerType == CustomerType.SOLE_PROPRIETOR;
    }

    public boolean isCorporate() {
        return !isIndividual();
    }
}
