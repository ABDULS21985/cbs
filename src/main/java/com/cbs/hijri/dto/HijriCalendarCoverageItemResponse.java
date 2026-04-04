package com.cbs.hijri.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriCalendarCoverageItemResponse {
    private Integer hijriYear;
    private Integer monthsCovered;
    private String source;
    private Instant importedAt;
}
