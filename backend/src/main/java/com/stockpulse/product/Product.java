package com.stockpulse.product;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    @NotBlank(message = "SKU is required")
    private String sku;

    @NotBlank(message = "Name is required")
    private String name;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Category is required")
    private Category category;

    @Positive(message = "Current price must be greater than zero")
    private BigDecimal currentPrice;

    @PositiveOrZero(message = "Stock level must be zero or positive")
    private Integer stockLevel = 0;

    @PositiveOrZero(message = "Reorder threshold must be zero or positive")
    private Integer reorderThreshold = 0;

    @PositiveOrZero(message = "Demand velocity must be zero or positive")
    private Double demandVelocity = 0.0;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Status is required")
    private Status status = Status.ACTIVE;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        updateStatusBasedOnStock();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        updateStatusBasedOnStock();
    }

    private void updateStatusBasedOnStock() {
        if (stockLevel == 0) {
            status = Status.OUT_OF_STOCK;
        }
    }
}