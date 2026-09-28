package com.stockpulse.product;

import com.stockpulse.agent.DemandSpikeEvent;
import com.stockpulse.agent.InventoryLowEvent;
import com.stockpulse.commerce.CategoryDemandService;
import com.stockpulse.product.dto.ProductCreateRequest;
import com.stockpulse.product.dto.ProductResponse;
import com.stockpulse.product.dto.StockUpdateRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final CategoryDemandService categoryDemandService;
    
    @Value("${stockpulse.demand.spikeMultiplier:3.0}")
    private double demandSpikeMultiplier;

    public ProductService(ProductRepository productRepository, 
                         ApplicationEventPublisher eventPublisher,
                         CategoryDemandService categoryDemandService) {
        this.productRepository = productRepository;
        this.eventPublisher = eventPublisher;
        this.categoryDemandService = categoryDemandService;
    }

    public Product createProduct(ProductCreateRequest request) {
        Product product = new Product();
        product.setSku(request.sku());
        product.setName(request.name());
        product.setCategory(request.category());
        product.setCurrentPrice(request.currentPrice());
        product.setStockLevel(request.stockLevel());
        product.setReorderThreshold(request.reorderThreshold());
        product.setDemandVelocity(request.demandVelocity());
        
        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts(Status status, Category category) {
        List<Product> products;
        
        if (status != null && category != null) {
            products = productRepository.findAll().stream()
                    .filter(p -> p.getStatus() == status && p.getCategory() == category)
                    .collect(Collectors.toList());
        } else if (status != null) {
            products = productRepository.findAll().stream()
                    .filter(p -> p.getStatus() == status)
                    .collect(Collectors.toList());
        } else if (category != null) {
            products = productRepository.findAll().stream()
                    .filter(p -> p.getCategory() == category)
                    .collect(Collectors.toList());
        } else {
            products = productRepository.findAll();
        }
        
        return products.stream()
                .map(this::toProductResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product with id " + id + " not found"));
    }

    public Product updateStock(Long id, StockUpdateRequest request) {
        Product product = getProductById(id);
        int oldStock = product.getStockLevel();
        product.setStockLevel(request.stockLevel());
        
        Product updatedProduct = productRepository.save(product);
        
        // Check if inventory is low and publish event
        if (updatedProduct.getStockLevel() < updatedProduct.getReorderThreshold()) {
            eventPublisher.publishEvent(new InventoryLowEvent(updatedProduct.getId()));
        }
        
        return updatedProduct;
    }
    
    public Product simulateSale(Long id, int quantity) {
        Product product = getProductById(id);
        
        // Decrease stock
        int newStock = product.getStockLevel() - quantity;
        if (newStock < 0) {
            throw new IllegalArgumentException("Insufficient stock for product ID: " + id);
        }
        product.setStockLevel(newStock);
        
        // Increase demand velocity
        double newDemandVelocity = product.getDemandVelocity() + 1.0;
        product.setDemandVelocity(newDemandVelocity);
        
        Product updatedProduct = productRepository.save(product);
        
        // Check if inventory is low and publish event
        if (updatedProduct.getStockLevel() < updatedProduct.getReorderThreshold()) {
            eventPublisher.publishEvent(new InventoryLowEvent(updatedProduct.getId()));
        }
        
        // Check for demand spike
        double categoryAverage = categoryDemandService.getCategoryAverageDemandVelocity(updatedProduct.getCategory());
        if (categoryAverage > 0 && updatedProduct.getDemandVelocity() > categoryAverage * demandSpikeMultiplier) {
            eventPublisher.publishEvent(new DemandSpikeEvent(updatedProduct.getId()));
        }
        
        return updatedProduct;
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