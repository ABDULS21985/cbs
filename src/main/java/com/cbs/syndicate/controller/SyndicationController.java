package com.cbs.syndicate.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.repository.SyndicateArrangementRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/syndication")
@RequiredArgsConstructor
@Tag(name = "Syndication", description = "Syndicated loan facilities list")
public class SyndicationController {

    private final SyndicateArrangementRepository syndicateArrangementRepository;

    @GetMapping
    @Operation(summary = "List all syndicated loan facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicateArrangement>>> listSyndications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SyndicateArrangement> result = syndicateArrangementRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
