package com.cbs.rulesengine.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionDifferenceResponse {
    private String field;
    private Object oldValue;
    private Object newValue;
}
