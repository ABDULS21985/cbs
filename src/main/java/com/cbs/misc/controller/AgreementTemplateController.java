package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.misc.entity.AgreementTemplate;
import com.cbs.misc.repository.AgreementTemplateRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/agreement-templates") @RequiredArgsConstructor
@Tag(name = "Agreement Templates", description = "Agreement template management")
public class AgreementTemplateController {
    private final AgreementTemplateRepository templateRepository;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AgreementTemplate>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.findAllByOrderByNameAsc()));
    }
}
