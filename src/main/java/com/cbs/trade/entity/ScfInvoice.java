package com.cbs.trade.entity;

import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "scf_invoice", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScfInvoice {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "programme_id", nullable = false)
    private SupplyChainProgramme programme;

    @Column(name = "invoice_number", nullable = false, length = 50) private String invoiceNumber;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "seller_customer_id") private Customer seller;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "buyer_customer_id") private Customer buyer;
    @Column(name = "invoice_amount", nullable = false, precision = 18, scale = 2) private BigDecimal invoiceAmount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "invoice_date", nullable = false) private LocalDate invoiceDate;
    @Column(name = "due_date", nullable = false) private LocalDate dueDate;
    @Column(name = "financed_amount", precision = 18, scale = 2) private BigDecimal financedAmount;
    @Column(name = "discount_amount", precision = 18, scale = 2) private BigDecimal discountAmount;
    @Column(name = "net_payment", precision = 18, scale = 2) private BigDecimal netPayment;
    @Column(name = "financing_date") private LocalDate financingDate;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "SUBMITTED";
    @Column(name = "settled_date") private LocalDate settledDate;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
