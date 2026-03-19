package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.nostro.entity.CorrespondentBank;
import com.cbs.nostro.repository.CorrespondentBankRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/banks")
@RequiredArgsConstructor
@Tag(name = "Bank Directory", description = "SWIFT bank directory search")
public class SwiftBankDirectoryController {

    private final CorrespondentBankRepository correspondentBankRepository;

    @GetMapping("/swift")
    @Operation(summary = "SWIFT bank directory search")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CorrespondentBank>>> searchSwiftBanks(
            @RequestParam(required = false) String search) {
        List<CorrespondentBank> banks = correspondentBankRepository.findAll();
        if (search != null && !search.isBlank()) {
            String searchLower = search.toLowerCase();
            banks = banks.stream()
                    .filter(b -> (b.getBankName() != null && b.getBankName().toLowerCase().contains(searchLower))
                            || (b.getSwiftBic() != null && b.getSwiftBic().toLowerCase().contains(searchLower))
                            || (b.getCountry() != null && b.getCountry().toLowerCase().contains(searchLower)))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(banks));
    }
}
