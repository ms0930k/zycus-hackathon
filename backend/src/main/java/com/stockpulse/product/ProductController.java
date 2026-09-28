package com.stockpulse.product;

import com.stockpulse.product.dto.OrderCreateRequest;
import com.stockpulse.product.dto.ProductCreateRequest;
import com.stockpulse.product.dto.ProductResponse;
import com.stockpulse.product.dto.StockUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:4200"})
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductCreateRequest request) {
        Product product = productService.createProduct(request);
        ProductResponse response = toProductResponse(product);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getProducts(
            @RequestParam(required = false) Status status,
            @RequestParam(required = false) Category category) {
        List<ProductResponse> products = productService.getAllProducts(status, category);
        return ResponseEntity.ok(products);
    }

    @PatchMapping("/{id}/stock")
    public ResponseEntity<ProductResponse> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody StockUpdateRequest request) {
        Product product = productService.updateStock(id, request);
        ProductResponse response = toProductResponse(product);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/orders")
    public ResponseEntity<ProductResponse> simulateSale(
            @PathVariable Long id,
            @Valid @RequestBody OrderCreateRequest request) {
        Product product = productService.simulateSale(id, request.quantity());
        ProductResponse response = toProductResponse(product);
        return ResponseEntity.ok(response);
    }

    private ProductResponse toProductResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getCategory(),
                product.getCurrentPrice(),
                product.getStockLevel(),
                product.getReorderThreshold(),
                product.getDemandVelocity(),
                product.getStatus(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}