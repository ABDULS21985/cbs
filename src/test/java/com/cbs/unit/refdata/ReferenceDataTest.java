package com.cbs.unit.refdata;

import com.cbs.common.exception.BusinessException;
import com.cbs.counterparty.entity.Counterparty;
import com.cbs.counterparty.repository.CounterpartyRepository;
import com.cbs.counterparty.service.CounterpartyService;
import com.cbs.partyrouting.entity.PartyRoutingProfile;
import com.cbs.partyrouting.repository.PartyRoutingProfileRepository;
import com.cbs.partyrouting.service.PartyRoutingService;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import com.cbs.productcatalog.service.ProductCatalogService;
import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.repository.SyndicateArrangementRepository;
import com.cbs.syndicate.service.SyndicateService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReferenceDataTest {

    // ========================================================================
    // CounterpartyService - Exposure and KYC Tests
    // ========================================================================

    @Nested
    @DisplayName("CounterpartyService - Exposure and KYC Tests")
    @ExtendWith(MockitoExtension.class)
    class CounterpartyTests {

        @Mock private CounterpartyRepository counterpartyRepository;

        @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private CounterpartyService counterpartyService;

        @Test
        @DisplayName("updateExposure recalculates available limit from total exposure limit minus new exposure")
        void updateExposure_recalculatesAvailableLimit() {
            Counterparty cp = Counterparty.builder()
                    .id(1L).counterpartyCode("CP-BANK001")
                    .counterpartyName("Global Bank PLC").counterpartyType("BANK")
                    .country("GB").totalExposureLimit(new BigDecimal("50000000.00"))
                    .currentExposure(new BigDecimal("10000000.00"))
                    .availableLimit(new BigDecimal("40000000.00"))
                    .kycStatus("VERIFIED").riskCategory("LOW").status("ACTIVE")
                    .build();

            when(counterpartyRepository.findByCounterpartyCode("CP-BANK001")).thenReturn(Optional.of(cp));
            when(counterpartyRepository.save(any(Counterparty.class))).thenAnswer(inv -> inv.getArgument(0));

            Counterparty result = counterpartyService.updateExposure("CP-BANK001", new BigDecimal("30000000.00"));

            assertThat(result.getCurrentExposure()).isEqualByComparingTo(new BigDecimal("30000000.00"));
            assertThat(result.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("20000000.00"));
            verify(counterpartyRepository).save(any(Counterparty.class));
        }

        @Test
        @DisplayName("verifyKyc rejects PROHIBITED counterparty with BusinessException")
        void verifyKyc_rejectsProhibitedCounterparty() {
            Counterparty prohibited = Counterparty.builder()
                    .id(2L).counterpartyCode("CP-SANCTIONED")
                    .counterpartyName("Sanctioned Entity").counterpartyType("CORPORATE")
                    .country("XX").riskCategory("PROHIBITED").kycStatus("PENDING")
                    .status("ACTIVE")
                    .build();

            when(counterpartyRepository.findByCounterpartyCode("CP-SANCTIONED")).thenReturn(Optional.of(prohibited));

            assertThatThrownBy(() -> counterpartyService.verifyKyc("CP-SANCTIONED"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("PROHIBITED");
        }
    }

    // ========================================================================
    // SyndicateService - Arrangement Lifecycle Tests
    // ========================================================================

    @Nested
    @DisplayName("SyndicateService - Arrangement Lifecycle Tests")
    @ExtendWith(MockitoExtension.class)
    class SyndicateTests {

        @Mock private SyndicateArrangementRepository syndicateRepository;

        @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private SyndicateService syndicateService;

        @Test
        @DisplayName("create calculates our share percentage from commitment and total facility")
        void create_calculatesOurSharePct() {
            SyndicateArrangement syndicate = SyndicateArrangement.builder()
                    .syndicateName("Project Alpha Syndication")
                    .syndicateType("TERM_LOAN")
                    .leadArranger("Lead Bank PLC")
                    .totalFacilityAmount(new BigDecimal("100000000.00"))
                    .ourCommitment(new BigDecimal("25000000.00"))
                    .borrowerName("Alpha Corp")
                    .currency("USD").tenorMonths(60)
                    .build();

            when(syndicateRepository.save(any(SyndicateArrangement.class))).thenAnswer(inv -> inv.getArgument(0));

            SyndicateArrangement result = syndicateService.create(syndicate);

            assertThat(result.getSyndicateCode()).startsWith("SYN-");
            // 25M / 100M * 100 = 25.0000%
            assertThat(result.getOurSharePct()).isEqualByComparingTo(new BigDecimal("25.0000"));
            verify(syndicateRepository).save(any(SyndicateArrangement.class));
        }

        @Test
        @DisplayName("activate sets status to ACTIVE and records signing date")
        void activate_setsActiveStatusAndSigningDate() {
            SyndicateArrangement arrangement = SyndicateArrangement.builder()
                    .id(1L).syndicateCode("SYN-BETA001")
                    .syndicateName("Beta Facility").syndicateType("REVOLVING_CREDIT")
                    .leadArranger("Arranger Bank").totalFacilityAmount(new BigDecimal("50000000.00"))
                    .ourCommitment(new BigDecimal("10000000.00"))
                    .status("STRUCTURING")
                    .build();

            when(syndicateRepository.findBySyndicateCode("SYN-BETA001")).thenReturn(Optional.of(arrangement));
            when(syndicateRepository.save(any(SyndicateArrangement.class))).thenAnswer(inv -> inv.getArgument(0));

            SyndicateArrangement result = syndicateService.activate("SYN-BETA001");

            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            assertThat(result.getSigningDate()).isEqualTo(LocalDate.now());
            verify(syndicateRepository).save(any(SyndicateArrangement.class));
        }
    }

    // ========================================================================
    // ProductCatalogService - Product Launch Tests
    // ========================================================================

    @Nested
    @DisplayName("ProductCatalogService - Product Launch Tests")
    @ExtendWith(MockitoExtension.class)
    class ProductCatalogTests {

        @Mock private ProductCatalogEntryRepository catalogRepository;

        @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private ProductCatalogService productCatalogService;

        @Test
        @DisplayName("launch transitions product to ACTIVE and records launch timestamp")
        void launch_transitionsToActiveWithTimestamp() {
            ProductCatalogEntry entry = ProductCatalogEntry.builder()
                    .id(1L).productCode("PRD-SAVINGS01")
                    .productName("Premium Savings Account").productFamily("DEPOSITS")
                    .targetSegment("RETAIL").status("DRAFT")
                    .isShariaCompliant(false)
                    .build();

            when(catalogRepository.findByProductCode("PRD-SAVINGS01")).thenReturn(Optional.of(entry));
            when(catalogRepository.save(any(ProductCatalogEntry.class))).thenAnswer(inv -> inv.getArgument(0));

            ProductCatalogEntry result = productCatalogService.launch("PRD-SAVINGS01");

            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            assertThat(result.getLaunchedAt()).isNotNull();
            verify(catalogRepository).save(any(ProductCatalogEntry.class));
        }
    }

    // ========================================================================
    // PartyRoutingService - Profile Upsert Tests
    // ========================================================================

    @Nested
    @DisplayName("PartyRoutingService - Profile Upsert Tests")
    @ExtendWith(MockitoExtension.class)
    class PartyRoutingTests {

        @Mock private PartyRoutingProfileRepository profileRepository;

        @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private PartyRoutingService partyRoutingService;

        @Test
        @DisplayName("upsert creates new profile when customer has no existing routing profile")
        void upsert_createsNewProfileForNewCustomer() {
            PartyRoutingProfile newProfile = PartyRoutingProfile.builder()
                    .customerId(999L).preferredChannel("MOBILE")
                    .preferredLanguage("en").assignedRmId("RM-001")
                    .serviceTier("PREMIUM")
                    .contactPreferences(Map.of("sms", true, "email", true))
                    .build();

            when(profileRepository.findByCustomerId(999L)).thenReturn(Optional.empty());
            when(profileRepository.save(any(PartyRoutingProfile.class))).thenAnswer(inv -> inv.getArgument(0));

            PartyRoutingProfile result = partyRoutingService.upsert(newProfile);

            assertThat(result.getCustomerId()).isEqualTo(999L);
            assertThat(result.getPreferredChannel()).isEqualTo("MOBILE");
            assertThat(result.getServiceTier()).isEqualTo("PREMIUM");
            verify(profileRepository).save(any(PartyRoutingProfile.class));
        }

        @Test
        @DisplayName("upsert updates existing profile fields when customer already has a routing profile")
        void upsert_updatesExistingProfile() {
            PartyRoutingProfile existing = PartyRoutingProfile.builder()
                    .id(1L).customerId(100L).preferredChannel("BRANCH")
                    .preferredLanguage("en").assignedRmId("RM-OLD")
                    .serviceTier("STANDARD")
                    .build();

            PartyRoutingProfile updated = PartyRoutingProfile.builder()
                    .customerId(100L).preferredChannel("ONLINE")
                    .preferredLanguage("fr").assignedRmId("RM-NEW")
                    .serviceTier("GOLD")
                    .contactPreferences(Map.of("email", true))
                    .build();

            when(profileRepository.findByCustomerId(100L)).thenReturn(Optional.of(existing));
            when(profileRepository.save(any(PartyRoutingProfile.class))).thenAnswer(inv -> inv.getArgument(0));

            PartyRoutingProfile result = partyRoutingService.upsert(updated);

            assertThat(result.getPreferredChannel()).isEqualTo("ONLINE");
            assertThat(result.getPreferredLanguage()).isEqualTo("fr");
            assertThat(result.getAssignedRmId()).isEqualTo("RM-NEW");
            assertThat(result.getServiceTier()).isEqualTo("GOLD");
            assertThat(result.getUpdatedAt()).isNotNull();
            verify(profileRepository).save(any(PartyRoutingProfile.class));
        }
    }
}
