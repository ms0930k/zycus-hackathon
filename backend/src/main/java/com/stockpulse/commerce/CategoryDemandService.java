package com.stockpulse.commerce;

import com.stockpulse.product.Category;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryDemandService {

    private final ProductRepository productRepository;

    public CategoryDemandService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public double getCategoryAverageDemandVelocity(Category category) {
        List<Product> productsInCategory = productRepository.findAll().stream()
                .filter(p -> p.getCategory() == category)
                .collect(Collectors.toList());

        if (productsInCategory.isEmpty()) {
            return 0.0;
        }

        double sum = productsInCategory.stream()
                .mapToDouble(p -> p.getDemandVelocity() == null ? 0.0 : p.getDemandVelocity())
                .sum();

        return sum / productsInCategory.size();
    }
}