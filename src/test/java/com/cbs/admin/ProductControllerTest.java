package com.cbs.admin;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.product.controller.ProductController;
import com.cbs.productbundle.entity.ProductBundle;
import com.cbs.productbundle.repository.ProductBundleRepository;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    @Mock private ProductCatalogEntryRepository productCatalogEntryRepository;
    @Mock private ProductTemplateRepository productTemplateRepository;
    @Mock private ProductBundleRepository productBundleRepository;
    @Mock private AccountRepository accountRepository;

    @InjectMocks private ProductController controller;

    private ProductCatalogEntry createMockProduct(Long id, String code, String name, String status) {
        ProductCatalogEntry product = new ProductCatalogEntry();
        product.setId(id);
        product.setProductCode(code);
        product.setProductName(name);
        product.setStatus(status);
        return product;
    }

    @Test
    @DisplayName("GET /v1/products returns paginated product list")
    void listProducts_ReturnsList() {
        ProductCatalogEntry product = createMockProduct(1L, "SAV-001", "Premium Savings", "ACTIVE");
        Page<ProductCatalogEntry> page = new PageImpl<>(List.of(product));
        when(productCatalogEntryRepository.findAll(any(Pageable.class))).thenReturn(page);

        ResponseEntity<ApiResponse<List<ProductCatalogEntry>>> response =
                controller.listProducts(0, 100, null, null, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("GET /v1/products/{id} returns product detail")
    void getProduct_ReturnsProduct() {
        ProductCatalogEntry product = createMockProduct(1L, "SAV-001", "Premium Savings", "ACTIVE");
        when(productCatalogEntryRepository.findById(1L)).thenReturn(Optional.of(product));

        ResponseEntity<ApiResponse<ProductCatalogEntry>> response = controller.getProduct(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getProductCode()).isEqualTo("SAV-001");
    }

    @Test
    @DisplayName("POST /v1/products creates a draft product")
    void createProduct_ReturnsDraftProduct() {
        ProductCatalogEntry product = createMockProduct(null, "NEW-001", "New Product", null);
        when(productCatalogEntryRepository.save(any())).thenAnswer(inv -> {
            ProductCatalogEntry p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        ResponseEntity<ApiResponse<ProductCatalogEntry>> response = controller.createProduct(product);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("POST /v1/products/{id}/publish sets status to ACTIVE")
    void publishProduct_SetsActive() {
        ProductCatalogEntry product = createMockProduct(1L, "SAV-001", "Premium Savings", "DRAFT");
        when(productCatalogEntryRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productCatalogEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<ProductCatalogEntry>> response = controller.publishProduct(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getBody().getData().getLaunchedAt()).isNotNull();
    }

    @Test
    @DisplayName("POST /v1/products/{id}/retire sets status to RETIRED")
    void retireProduct_SetsRetired() {
        ProductCatalogEntry product = createMockProduct(1L, "SAV-001", "Premium Savings", "ACTIVE");
        when(productCatalogEntryRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productCatalogEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<ProductCatalogEntry>> response = controller.retireProduct(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("RETIRED");
        assertThat(response.getBody().getData().getRetiredAt()).isNotNull();
    }

    @Test
    @DisplayName("GET /v1/products/bundles returns bundle list")
    void listBundles_ReturnsList() {
        Page<ProductBundle> page = new PageImpl<>(List.of());
        when(productBundleRepository.findAll(any(Pageable.class))).thenReturn(page);

        ResponseEntity<ApiResponse<List<ProductBundle>>> response = controller.listBundles(0, 20);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("GET /v1/products/stats returns product statistics")
    void getStats_ReturnsStats() {
        when(productCatalogEntryRepository.count()).thenReturn(10L);
        when(productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc("ACTIVE")).thenReturn(List.of());
        when(productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc("DRAFT")).thenReturn(List.of());
        when(productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc("RETIRED")).thenReturn(List.of());
        when(productTemplateRepository.count()).thenReturn(5L);
        when(productBundleRepository.count()).thenReturn(2L);

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.getStats();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsKeys(
                "totalCatalogProducts", "activeProducts", "draftProducts", "retiredProducts");
    }

    @Test
    @DisplayName("POST /v1/products/bundles creates a bundle")
    void createBundle_ReturnsCreated() {
        ProductBundle bundle = new ProductBundle();
        bundle.setBundleCode("TEST");
        bundle.setBundleName("Test Bundle");
        when(productBundleRepository.save(any())).thenReturn(bundle);

        ResponseEntity<ApiResponse<ProductBundle>> response = controller.createBundle(bundle);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
