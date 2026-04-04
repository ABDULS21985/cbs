package com.cbs.hijri.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriCalendarCoverageResponse {
    private List<HijriCalendarCoverageItemResponse> coverage;
}
