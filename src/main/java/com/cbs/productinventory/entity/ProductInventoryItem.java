package com.cbs.productinventory.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "product_inventory_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProductInventoryItem extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String itemCode;
    @Column(nullable = false, length = 25) private String itemType;
    @Column(nullable = false, length = 200) private String itemName;
    @Column(length = 40) private String sku;
    private Long branchId;
    @Column(length = 30) private String warehouseCode;
    @Builder.Default private Integer totalStock = 0;
    @Builder.Default private Integer allocatedStock = 0;
    @Builder.Default private Integer availableStock = 0;
    @Builder.Default private Integer reorderLevel = 10;
    @Builder.Default private Integer reorderQuantity = 100;
    private BigDecimal unitCost;
    private Instant lastReplenishedAt;
    private Instant lastIssuedAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
