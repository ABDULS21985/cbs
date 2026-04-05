package com.cbs.islamicaml.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListUpdateRequest {

    private String listName;
    private String listProvider;
    private String listType;
    private List<String> applicableCountries;
    private String updateFrequency;
    private String dataSourceUrl;
    private Integer totalEntries;
    private Boolean active;
    private Integer priority;
    private Boolean triggerCustomerRescreen;
    private Boolean triggerCounterpartyRescreen;
}
