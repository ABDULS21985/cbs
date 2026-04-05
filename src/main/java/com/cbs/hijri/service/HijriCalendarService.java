package com.cbs.hijri.service;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.service.AuditService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.hijri.dto.*;
import com.cbs.hijri.entity.*;
import com.cbs.hijri.repository.HijriDateMappingRepository;
import com.cbs.hijri.repository.HijriHolidayRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.chrono.HijrahDate;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class HijriCalendarService {

    private static final String[] MONTH_NAMES = {
            "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
            "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
            "Ramadan", "Shawwal", "Dhul Qa'dah", "Dhul Hijjah"
    };

    private static final String[] MONTH_NAMES_AR = {
            "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
            "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
            "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
    };

    private final HijriDateMappingRepository hijriDateMappingRepository;
    private final HijriHolidayRepository hijriHolidayRepository;
    private final SystemParameterRepository systemParameterRepository;
    private final CurrentTenantResolver currentTenantResolver;
    private final CurrentActorProvider currentActorProvider;
    private final AuditService auditService;

    public HijriDateResponse getCurrentHijriDate() {
        return toHijri(LocalDate.now());
    }

    public HijriDateResponse toHijri(LocalDate gregorianDate) {
        if (gregorianDate == null) {
            throw new BusinessException("gregorianDate is required");
        }

        Long tenantId = currentTenantResolver.getCurrentTenantId();
        Optional<HijriDateMapping> mapping = resolveMappingByGregorianDate(gregorianDate, tenantId);
        if (mapping.isPresent()) {
            return toHijriDateResponse(mapping.get());
        }

        log.warn("Hijri mapping not found for date {} and tenant {}. Falling back to Umm al-Qura approximation.",
                gregorianDate, tenantId);
        return toHijriDateResponse(toFallbackValue(gregorianDate), gregorianDate);
    }

    public LocalDate toGregorian(int hijriYear, int hijriMonth, int hijriDay) {
        validateHijriTriplet(hijriYear, hijriMonth, hijriDay);
        Long tenantId = currentTenantResolver.getCurrentTenantId();

        Optional<HijriDateMapping> mapping = resolveMappingByHijriDate(hijriYear, hijriMonth, hijriDay, tenantId);
        if (mapping.isPresent()) {
            return mapping.get().getGregorianDate();
        }

        log.warn("Hijri mapping not found for {}/{}/{} and tenant {}. Falling back to Umm al-Qura approximation.",
                hijriYear, hijriMonth, hijriDay, tenantId);
        return LocalDate.from(HijrahDate.of(hijriYear, hijriMonth, hijriDay));
    }

    public int getHijriMonth(LocalDate gregorianDate) {
        return resolveHijriValue(gregorianDate).hijriMonth();
    }

    public int getHijriYear(LocalDate gregorianDate) {
        return resolveHijriValue(gregorianDate).hijriYear();
    }

    public List<HijriDateResponse> getHijriMonthDays(int hijriYear, int hijriMonth) {
        validateHijriTriplet(hijriYear, hijriMonth, 1);
        Long tenantId = currentTenantResolver.getCurrentTenantId();

        List<HijriDateMapping> mappings = resolveMonthMappings(hijriYear, hijriMonth, tenantId);
        if (!mappings.isEmpty()) {
            return mappings.stream().map(this::toHijriDateResponse).toList();
        }

        List<HijriDateResponse> fallback = new ArrayList<>();
        int maxDays = LocalDate.from(HijrahDate.of(hijriYear, hijriMonth, 1)).lengthOfMonth();
        for (int day = 1; day <= maxDays; day++) {
            LocalDate gregorian = LocalDate.from(HijrahDate.of(hijriYear, hijriMonth, day));
            fallback.add(toHijriDateResponse(new FallbackHijriValue(
                    hijriYear, hijriMonth, day, monthName(hijriMonth), monthNameAr(hijriMonth),
                    gregorian.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH)
            ), gregorian));
        }
        return fallback;
    }

    public boolean isHijriHoliday(LocalDate gregorianDate) {
        return !getHolidaysInRange(gregorianDate, gregorianDate).isEmpty();
    }

    public boolean isIslamicBusinessDay(LocalDate gregorianDate) {
        Set<DayOfWeek> weekendDays = resolveWeekendDays(currentTenantResolver.getCurrentTenantId());
        if (weekendDays.contains(gregorianDate.getDayOfWeek())) {
            return false;
        }

        return getHolidaysInRange(gregorianDate, gregorianDate).stream()
                .noneMatch(holiday -> holiday.getHolidayType() == HijriHolidayType.PUBLIC_HOLIDAY
                        || holiday.getHolidayType() == HijriHolidayType.BANK_HOLIDAY);
    }

    public LocalDate getNextIslamicBusinessDay(LocalDate from) {
        LocalDate current = from;
        int maxIterations = 30;
        int iterations = 0;
        while (!isIslamicBusinessDay(current)) {
            current = current.plusDays(1);
            iterations++;
            if (iterations >= maxIterations) {
                throw new BusinessException(
                        "Unable to find an Islamic business day within " + maxIterations
                                + " days from " + from + ". Check holiday configuration.",
                        "NO_BUSINESS_DAY_FOUND");
            }
        }
        return current;
    }

    public int getIslamicBusinessDaysBetween(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BusinessException("Both from and to dates are required");
        }
        if (to.isBefore(from)) {
            throw new BusinessException("to date must be on or after from date");
        }

        int count = 0;
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (isIslamicBusinessDay(date)) {
                count++;
            }
        }
        return count;
    }

    public List<ResolvedHolidayResponse> getActiveHolidays() {
        LocalDate today = LocalDate.now();
        return resolveHolidayResponses(getActiveHolidaysForTenant(currentTenantResolver.getCurrentTenantId()), today, today.plusYears(1))
                .stream()
                .sorted(Comparator.comparing(ResolvedHolidayResponse::getGregorianDateFrom))
                .toList();
    }

    public List<ResolvedHolidayResponse> getHolidaysInRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BusinessException("Both from and to dates are required");
        }
        if (to.isBefore(from)) {
            throw new BusinessException("to date must be on or after from date");
        }

        return resolveHolidayResponses(getActiveHolidaysForTenant(currentTenantResolver.getCurrentTenantId()), from, to)
                .stream()
                .sorted(Comparator.comparing(ResolvedHolidayResponse::getGregorianDateFrom))
                .toList();
    }

    public boolean isRamadan(LocalDate gregorianDate) {
        return getHijriMonth(gregorianDate) == 9;
    }

    public LocalDate getZakatCalculationDate(int hijriYear) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        int month = resolveIntegerParameter("islamic.zakat.calculation.hijri-month", tenantId, 9);
        int day = resolveIntegerParameter("islamic.zakat.calculation.hijri-day", tenantId, 29);
        return toGregorian(hijriYear, month, day);
    }

    @Transactional
    public List<HijriDateResponse> importHijriCalendar(HijriCalendarImportRequest request) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        validateImportRequest(request, tenantId);

        List<HijriDateMapping> entities = request.getMappings().stream()
                .map(item -> (HijriDateMapping) HijriDateMapping.builder()
                        .hijriYear(request.getHijriYear())
                        .hijriMonth(item.getHijriMonth())
                        .hijriDay(item.getHijriDay())
                        .gregorianDate(item.getGregorianDate())
                        .hijriMonthName(monthName(item.getHijriMonth()))
                        .hijriMonthNameAr(monthNameAr(item.getHijriMonth()))
                        .dayOfWeek(item.getGregorianDate().getDayOfWeek()
                                .getDisplayName(TextStyle.FULL, Locale.ENGLISH))
                        .source(request.getSource().trim().toUpperCase(Locale.ROOT))
                        .tenantId(tenantId)
                        .build())
                .toList();

        List<HijriDateMapping> saved = hijriDateMappingRepository.saveAll(entities);
        auditService.log("HijriDateMapping", saved.getFirst().getId(), AuditAction.CREATE,
                currentActorProvider.getCurrentActor(),
                "Imported Hijri calendar year " + request.getHijriYear());
        return saved.stream().map(this::toHijriDateResponse).toList();
    }

    public HijriCalendarCoverageResponse getCoverage() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<HijriDateMapping> mappings = tenantId != null
                ? hijriDateMappingRepository.findByTenantIdOrderByHijriYearAscHijriMonthAscHijriDayAsc(tenantId)
                : hijriDateMappingRepository.findByTenantIdIsNullOrderByHijriYearAscHijriMonthAscHijriDayAsc();

        Map<String, List<HijriDateMapping>> grouped = mappings.stream()
                .collect(Collectors.groupingBy(mapping -> mapping.getHijriYear() + "::" + mapping.getSource(),
                        LinkedHashMap::new, Collectors.toList()));

        List<HijriCalendarCoverageItemResponse> coverage = grouped.values().stream()
                .map(group -> HijriCalendarCoverageItemResponse.builder()
                        .hijriYear(group.getFirst().getHijriYear())
                        .monthsCovered((int) group.stream().map(HijriDateMapping::getHijriMonth).distinct().count())
                        .source(group.getFirst().getSource())
                        .importedAt(group.stream()
                                .map(HijriDateMapping::getCreatedAt)
                                .filter(Objects::nonNull)
                                .max(Comparator.naturalOrder())
                                .orElse(null))
                        .build())
                .toList();

        return HijriCalendarCoverageResponse.builder()
                .coverage(coverage)
                .build();
    }

    @Transactional
    public HijriHolidayResponse createHoliday(HijriHolidayRequest request) {
        HijriHoliday holiday = HijriHoliday.builder()
                .name(request.getName())
                .nameAr(request.getNameAr())
                .holidayType(request.getHolidayType())
                .hijriMonth(request.getHijriMonth())
                .hijriDayFrom(request.getHijriDayFrom())
                .hijriDayTo(request.getHijriDayTo())
                .durationDays(request.getDurationDays())
                .year(request.getYear())
                .affectsSettlement(Boolean.TRUE.equals(request.getAffectsSettlement()))
                .affectsTrading(Boolean.TRUE.equals(request.getAffectsTrading()))
                .affectsProfit(Boolean.TRUE.equals(request.getAffectsProfit()))
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .notes(request.getNotes())
                .status(HijriHolidayStatus.ACTIVE)
                .build();

        HijriHoliday saved = hijriHolidayRepository.save(holiday);
        auditService.log("HijriHoliday", saved.getId(), AuditAction.CREATE,
                currentActorProvider.getCurrentActor(), "Created Hijri holiday " + saved.getName());
        return toHolidayResponse(saved);
    }

    @Transactional
    public HijriHolidayResponse updateHoliday(Long id, HijriHolidayRequest request) {
        HijriHoliday holiday = hijriHolidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HijriHoliday", "id", id));
        holiday.setName(request.getName());
        holiday.setNameAr(request.getNameAr());
        holiday.setHolidayType(request.getHolidayType());
        holiday.setHijriMonth(request.getHijriMonth());
        holiday.setHijriDayFrom(request.getHijriDayFrom());
        holiday.setHijriDayTo(request.getHijriDayTo());
        holiday.setDurationDays(request.getDurationDays());
        holiday.setYear(request.getYear());
        holiday.setAffectsSettlement(Boolean.TRUE.equals(request.getAffectsSettlement()));
        holiday.setAffectsTrading(Boolean.TRUE.equals(request.getAffectsTrading()));
        holiday.setAffectsProfit(Boolean.TRUE.equals(request.getAffectsProfit()));
        holiday.setNotes(request.getNotes());

        HijriHoliday saved = hijriHolidayRepository.save(holiday);
        auditService.log("HijriHoliday", saved.getId(), AuditAction.UPDATE,
                currentActorProvider.getCurrentActor(), "Updated Hijri holiday " + saved.getName());
        return toHolidayResponse(saved);
    }

    @Transactional
    public void deactivateHoliday(Long id) {
        HijriHoliday holiday = hijriHolidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HijriHoliday", "id", id));
        holiday.setStatus(HijriHolidayStatus.INACTIVE);
        hijriHolidayRepository.save(holiday);
        auditService.log("HijriHoliday", holiday.getId(), AuditAction.DELETE,
                currentActorProvider.getCurrentActor(), "Deactivated Hijri holiday " + holiday.getName());
    }

    private Optional<HijriDateMapping> resolveMappingByGregorianDate(LocalDate gregorianDate, Long tenantId) {
        if (tenantId != null) {
            Optional<HijriDateMapping> tenantMapping =
                    hijriDateMappingRepository.findByGregorianDateAndTenantId(gregorianDate, tenantId);
            if (tenantMapping.isPresent()) {
                return tenantMapping;
            }
        }
        return hijriDateMappingRepository.findByGregorianDateAndTenantIdIsNull(gregorianDate);
    }

    private Optional<HijriDateMapping> resolveMappingByHijriDate(int year, int month, int day, Long tenantId) {
        if (tenantId != null) {
            Optional<HijriDateMapping> tenantMapping = hijriDateMappingRepository
                    .findByHijriYearAndHijriMonthAndHijriDayAndTenantId(year, month, day, tenantId);
            if (tenantMapping.isPresent()) {
                return tenantMapping;
            }
        }
        return hijriDateMappingRepository.findByHijriYearAndHijriMonthAndHijriDayAndTenantIdIsNull(year, month, day);
    }

    private List<HijriDateMapping> resolveMonthMappings(int year, int month, Long tenantId) {
        if (tenantId != null) {
            List<HijriDateMapping> tenantMappings =
                    hijriDateMappingRepository.findByHijriYearAndHijriMonthAndTenantIdOrderByHijriDayAsc(year, month, tenantId);
            if (!tenantMappings.isEmpty()) {
                return tenantMappings;
            }
        }
        return hijriDateMappingRepository.findByHijriYearAndHijriMonthAndTenantIdIsNullOrderByHijriDayAsc(year, month);
    }

    private List<HijriHoliday> getActiveHolidaysForTenant(Long tenantId) {
        if (tenantId != null) {
            List<HijriHoliday> tenantHolidays =
                    hijriHolidayRepository.findByTenantIdAndStatusOrderByHijriMonthAscHijriDayFromAsc(
                            tenantId, HijriHolidayStatus.ACTIVE);
            if (!tenantHolidays.isEmpty()) {
                return tenantHolidays;
            }
        }
        return hijriHolidayRepository.findByTenantIdIsNullAndStatusOrderByHijriMonthAscHijriDayFromAsc(
                HijriHolidayStatus.ACTIVE);
    }

    private List<ResolvedHolidayResponse> resolveHolidayResponses(List<HijriHoliday> holidays, LocalDate from, LocalDate to) {
        LinkedHashMap<String, ResolvedHolidayResponse> resolved = new LinkedHashMap<>();

        int startHijriYear = resolveHijriValue(from).hijriYear();
        int endHijriYear = resolveHijriValue(to.plusYears(1)).hijriYear();

        for (HijriHoliday holiday : holidays) {
            List<Integer> candidateYears;
            if (holiday.getYear() != null) {
                candidateYears = List.of(holiday.getYear());
            } else {
                candidateYears = new ArrayList<>();
                for (int year = startHijriYear; year <= endHijriYear; year++) {
                    candidateYears.add(year);
                }
            }

            for (Integer candidateYear : candidateYears) {
                try {
                    LocalDate start = toGregorian(candidateYear, holiday.getHijriMonth(), holiday.getHijriDayFrom());
                    LocalDate end = toGregorian(candidateYear, holiday.getHijriMonth(), holiday.getHijriDayTo());
                    if (end.isBefore(from) || start.isAfter(to)) {
                        continue;
                    }
                    String key = holiday.getId() + "::" + candidateYear + "::" + start;
                    resolved.putIfAbsent(key, ResolvedHolidayResponse.builder()
                            .holidayId(holiday.getId())
                            .name(holiday.getName())
                            .nameAr(holiday.getNameAr())
                            .gregorianDateFrom(start)
                            .gregorianDateTo(end)
                            .holidayType(holiday.getHolidayType())
                            .hijriYear(candidateYear)
                            .hijriMonth(holiday.getHijriMonth())
                            .build());
                } catch (Exception ex) {
                    log.warn("Unable to resolve Hijri holiday {} for Hijri year {}: {}",
                            holiday.getName(), candidateYear, ex.getMessage());
                }
            }
        }

        return new ArrayList<>(resolved.values());
    }

    private HijriDateResponse toHijriDateResponse(HijriDateMapping mapping) {
        LocalDate gregorianDate = mapping.getGregorianDate();
        return HijriDateResponse.builder()
                .hijriYear(mapping.getHijriYear())
                .hijriMonth(mapping.getHijriMonth())
                .hijriDay(mapping.getHijriDay())
                .hijriMonthName(mapping.getHijriMonthName())
                .hijriMonthNameAr(mapping.getHijriMonthNameAr())
                .gregorianDate(gregorianDate)
                .dayOfWeek(mapping.getDayOfWeek())
                .isHoliday(isHijriHolidayOnly(gregorianDate))
                .isBusinessDay(isIslamicBusinessDayWithoutHolidayLoop(gregorianDate))
                .build();
    }

    private HijriDateResponse toHijriDateResponse(FallbackHijriValue fallback, LocalDate gregorianDate) {
        return HijriDateResponse.builder()
                .hijriYear(fallback.hijriYear())
                .hijriMonth(fallback.hijriMonth())
                .hijriDay(fallback.hijriDay())
                .hijriMonthName(fallback.hijriMonthName())
                .hijriMonthNameAr(fallback.hijriMonthNameAr())
                .gregorianDate(gregorianDate)
                .dayOfWeek(fallback.dayOfWeek())
                .isHoliday(isHijriHolidayOnly(gregorianDate))
                .isBusinessDay(isIslamicBusinessDayWithoutHolidayLoop(gregorianDate))
                .build();
    }

    private HijriHolidayResponse toHolidayResponse(HijriHoliday holiday) {
        LocalDate referenceDate = LocalDate.now();
        ResolvedHolidayResponse resolved = resolveHolidayResponses(List.of(holiday), referenceDate.minusYears(1), referenceDate.plusYears(2))
                .stream()
                .filter(item -> !item.getGregorianDateTo().isBefore(referenceDate))
                .min(Comparator.comparing(ResolvedHolidayResponse::getGregorianDateFrom))
                .orElse(null);

        return HijriHolidayResponse.builder()
                .id(holiday.getId())
                .name(holiday.getName())
                .nameAr(holiday.getNameAr())
                .holidayType(holiday.getHolidayType())
                .hijriMonth(holiday.getHijriMonth())
                .hijriDayFrom(holiday.getHijriDayFrom())
                .hijriDayTo(holiday.getHijriDayTo())
                .durationDays(holiday.getDurationDays())
                .year(holiday.getYear())
                .affectsSettlement(holiday.getAffectsSettlement())
                .affectsTrading(holiday.getAffectsTrading())
                .affectsProfit(holiday.getAffectsProfit())
                .tenantId(holiday.getTenantId())
                .status(holiday.getStatus())
                .notes(holiday.getNotes())
                .gregorianDateFrom(resolved != null ? resolved.getGregorianDateFrom() : null)
                .gregorianDateTo(resolved != null ? resolved.getGregorianDateTo() : null)
                .createdAt(holiday.getCreatedAt())
                .updatedAt(holiday.getUpdatedAt())
                .build();
    }

    private FallbackHijriValue toFallbackValue(LocalDate gregorianDate) {
        HijrahDate hijrahDate = HijrahDate.from(gregorianDate);
        int month = hijrahDate.get(java.time.temporal.ChronoField.MONTH_OF_YEAR);
        return new FallbackHijriValue(
                hijrahDate.get(java.time.temporal.ChronoField.YEAR),
                month,
                hijrahDate.get(java.time.temporal.ChronoField.DAY_OF_MONTH),
                monthName(month),
                monthNameAr(month),
                gregorianDate.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH)
        );
    }

    private FallbackHijriValue resolveHijriValue(LocalDate gregorianDate) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return resolveMappingByGregorianDate(gregorianDate, tenantId)
                .map(mapping -> new FallbackHijriValue(
                        mapping.getHijriYear(),
                        mapping.getHijriMonth(),
                        mapping.getHijriDay(),
                        mapping.getHijriMonthName(),
                        mapping.getHijriMonthNameAr(),
                        mapping.getDayOfWeek()
                ))
                .orElseGet(() -> toFallbackValue(gregorianDate));
    }

    private boolean isHijriHolidayOnly(LocalDate gregorianDate) {
        return !resolveHolidayResponses(getActiveHolidaysForTenant(currentTenantResolver.getCurrentTenantId()),
                gregorianDate, gregorianDate).isEmpty();
    }

    private boolean isIslamicBusinessDayWithoutHolidayLoop(LocalDate gregorianDate) {
        Set<DayOfWeek> weekendDays = resolveWeekendDays(currentTenantResolver.getCurrentTenantId());
        if (weekendDays.contains(gregorianDate.getDayOfWeek())) {
            return false;
        }
        return !isHijriHolidayOnly(gregorianDate);
    }

    private Set<DayOfWeek> resolveWeekendDays(Long tenantId) {
        String configured = systemParameterRepository.findEffective("weekend.days", tenantId).stream()
                .findFirst()
                .map(parameter -> parameter.getParamValue())
                .orElse("FRIDAY,SATURDAY");

        EnumSet<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        for (String token : configured.split(",")) {
            if (!StringUtils.hasText(token)) {
                continue;
            }
            try {
                days.add(DayOfWeek.valueOf(token.trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ex) {
                log.warn("Ignoring invalid weekend day token '{}' in weekend.days configuration", token);
            }
        }
        if (days.isEmpty()) {
            days.add(DayOfWeek.FRIDAY);
            days.add(DayOfWeek.SATURDAY);
        }
        return days;
    }

    private int resolveIntegerParameter(String key, Long tenantId, int defaultValue) {
        return systemParameterRepository.findEffective(key, tenantId).stream()
                .findFirst()
                .map(parameter -> Integer.parseInt(parameter.getParamValue()))
                .orElse(defaultValue);
    }

    private void validateImportRequest(HijriCalendarImportRequest request, Long tenantId) {
        if (request.getMappings() == null || request.getMappings().isEmpty()) {
            throw new BusinessException("At least one Hijri date mapping is required");
        }

        Set<String> gregorianDates = new HashSet<>();
        Set<String> hijriDates = new HashSet<>();

        for (HijriDateMappingImportItem item : request.getMappings()) {
            validateHijriTriplet(request.getHijriYear(), item.getHijriMonth(), item.getHijriDay());
            String gregorianKey = item.getGregorianDate().toString();
            if (!gregorianDates.add(gregorianKey)) {
                throw new BusinessException("Import contains duplicate Gregorian date " + gregorianKey);
            }

            String hijriKey = item.getHijriMonth() + "-" + item.getHijriDay();
            if (!hijriDates.add(hijriKey)) {
                throw new BusinessException("Import contains duplicate Hijri date " + hijriKey);
            }

            if (tenantId != null && hijriDateMappingRepository.findByGregorianDateAndTenantId(item.getGregorianDate(), tenantId).isPresent()) {
                throw new BusinessException("Mapping already exists for Gregorian date " + item.getGregorianDate());
            }
            if (tenantId == null && hijriDateMappingRepository.findByGregorianDateAndTenantIdIsNull(item.getGregorianDate()).isPresent()) {
                throw new BusinessException("Mapping already exists for Gregorian date " + item.getGregorianDate());
            }
        }
    }

    private void validateHijriTriplet(int year, int month, int day) {
        if (month < 1 || month > 12) {
            throw new BusinessException("hijriMonth must be between 1 and 12");
        }
        if (day < 1 || day > 30) {
            throw new BusinessException("hijriDay must be between 1 and 30");
        }
        if (year < 1) {
            throw new BusinessException("hijriYear must be positive");
        }
    }

    private String monthName(int month) {
        return MONTH_NAMES[month - 1];
    }

    private String monthNameAr(int month) {
        return MONTH_NAMES_AR[month - 1];
    }

    private record FallbackHijriValue(
            int hijriYear,
            int hijriMonth,
            int hijriDay,
            String hijriMonthName,
            String hijriMonthNameAr,
            String dayOfWeek
    ) {
    }
}
