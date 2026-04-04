package com.cbs.productfactory.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "islamic_product_parameters", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicProductParameter extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_template_id", nullable = false)
    private IslamicProductTemplate productTemplate;

    @Column(name = "parameter_name", nullable = false, length = 120)
    private String parameterName;

    @Column(name = "parameter_value", columnDefinition = "TEXT")
    private String parameterValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "parameter_type", nullable = false, length = 20)
    private IslamicDomainEnums.ParameterType parameterType;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "description_ar", length = 500)
    private String descriptionAr;

    @Column(name = "is_editable", nullable = false)
    @Builder.Default
    private Boolean isEditable = true;

    @Column(name = "validation_rule", length = 500)
    private String validationRule;
}