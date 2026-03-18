package com.cbs.survey.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.survey.entity.CustomerSurvey;
import com.cbs.survey.entity.SurveyResponse;
import com.cbs.survey.service.SurveyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;

@RestController @RequestMapping("/v1/surveys") @RequiredArgsConstructor
@Tag(name = "Customer Surveys", description = "NPS, CSAT, feedback collection and analysis")
public class SurveyController {
    private final SurveyService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CustomerSurvey>> create(@RequestBody CustomerSurvey survey) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(survey))); }
    @PostMapping("/{code}/launch") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CustomerSurvey>> launch(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.launch(code))); }
    @PostMapping("/{code}/respond") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')") public ResponseEntity<ApiResponse<SurveyResponse>> respond(@PathVariable String code, @RequestBody SurveyResponse response) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitResponse(code, response))); }
    @PostMapping("/{code}/close") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CustomerSurvey>> close(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.close(code))); }
    @GetMapping("/type/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CustomerSurvey>>> getByType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByType(type))); }
    @GetMapping("/{code}/responses") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SurveyResponse>>> getResponses(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getResponses(code))); }
}
