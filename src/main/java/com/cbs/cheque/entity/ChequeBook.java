package com.cbs.cheque.entity;

import com.cbs.account.entity.Account;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cheque_book", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChequeBook {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "series_prefix", nullable = false, length = 10) private String seriesPrefix;
    @Column(name = "start_number", nullable = false) private Integer startNumber;
    @Column(name = "end_number", nullable = false) private Integer endNumber;
    @Column(name = "total_leaves", nullable = false) private Integer totalLeaves;
    @Column(name = "used_leaves", nullable = false) @Builder.Default private Integer usedLeaves = 0;
    @Column(name = "spoiled_leaves", nullable = false) @Builder.Default private Integer spoiledLeaves = 0;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(name = "issued_date", nullable = false) @Builder.Default private LocalDate issuedDate = LocalDate.now();
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;

    @OneToMany(mappedBy = "chequeBook", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default private List<ChequeLeaf> leaves = new ArrayList<>();

    public int remainingLeaves() { return totalLeaves - usedLeaves - spoiledLeaves; }
}
