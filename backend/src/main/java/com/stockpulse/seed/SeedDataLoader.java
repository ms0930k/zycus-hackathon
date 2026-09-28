package com.stockpulse.seed;

import com.stockpulse.product.Category;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import com.stockpulse.product.Status;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class SeedDataLoader implements CommandLineRunner {

    private final ProductRepository productRepository;

    public SeedDataLoader(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Check if seed data already exists
        if (productRepository.findBySku("PRD-001").isEmpty()) {
            createSeedProducts();
        }
    }

    private void createSeedProducts() {
        // PRD-001 Wireless Earbuds Pro
        Product product1 = new Product();
        product1.setSku("PRD-001");
        product1.setName("Wireless Earbuds Pro");
        product1.setCategory(Category.ELECTRONICS);
        product1.setCurrentPrice(BigDecimal.valueOf(79.99));
        product1.setStockLevel(45);
        product1.setReorderThreshold(20);
        product1.setDemandVelocity(3.0);
        product1.setStatus(Status.ACTIVE);
        productRepository.save(product1);

        // PRD-002 USB-C Hub 7-Port
        Product product2 = new Product();
        product2.setSku("PRD-002");
        product2.setName("USB-C Hub 7-Port");
        product2.setCategory(Category.ELECTRONICS);
        product2.setCurrentPrice(BigDecimal.valueOf(34.99));
        product2.setStockLevel(120);
        product2.setReorderThreshold(30);
        product2.setDemandVelocity(1.0);
        product2.setStatus(Status.ACTIVE);
        productRepository.save(product2);

        // PRD-003 Organic Cotton T-Shirt
        Product product3 = new Product();
        product3.setSku("PRD-003");
        product3.setName("Organic Cotton T-Shirt");
        product3.setCategory(Category.APPAREL);
        product3.setCurrentPrice(BigDecimal.valueOf(24.99));
        product3.setStockLevel(8);
        product3.setReorderThreshold(15);
        product3.setDemandVelocity(12.0);
        product3.setStatus(Status.PRICE_REVIEW_PENDING);
        productRepository.save(product3);

        // PRD-004 Running Shorts - Navy
        Product product4 = new Product();
        product4.setSku("PRD-004");
        product4.setName("Running Shorts - Navy");
        product4.setCategory(Category.APPAREL);
        product4.setCurrentPrice(BigDecimal.valueOf(39.99));
        product4.setStockLevel(55);
        product4.setReorderThreshold(20);
        product4.setDemandVelocity(2.0);
        product4.setStatus(Status.ACTIVE);
        productRepository.save(product4);

        // PRD-005 Ceramic Pour-Over Set
        Product product5 = new Product();
        product5.setSku("PRD-005");
        product5.setName("Ceramic Pour-Over Set");
        product5.setCategory(Category.HOME);
        product5.setCurrentPrice(BigDecimal.valueOf(49.99));
        product5.setStockLevel(22);
        product5.setReorderThreshold(10);
        product5.setDemandVelocity(4.0);
        product5.setStatus(Status.ACTIVE);
        productRepository.save(product5);

        // PRD-006 LED Desk Lamp - Dimmable
        Product product6 = new Product();
        product6.setSku("PRD-006");
        product6.setName("LED Desk Lamp - Dimmable");
        product6.setCategory(Category.HOME);
        product6.setCurrentPrice(BigDecimal.valueOf(59.99));
        product6.setStockLevel(0);
        product6.setReorderThreshold(15);
        product6.setDemandVelocity(0.0);
        product6.setStatus(Status.OUT_OF_STOCK);
        productRepository.save(product6);

        // PRD-007 Portable Charger 20K
        Product product7 = new Product();
        product7.setSku("PRD-007");
        product7.setName("Portable Charger 20K");
        product7.setCategory(Category.ELECTRONICS);
        product7.setCurrentPrice(BigDecimal.valueOf(44.99));
        product7.setStockLevel(18);
        product7.setReorderThreshold(25);
        product7.setDemandVelocity(8.0);
        product7.setStatus(Status.ACTIVE);
        productRepository.save(product7);

        // PRD-008 Hoodie - Heather Grey
        Product product8 = new Product();
        product8.setSku("PRD-008");
        product8.setName("Hoodie - Heather Grey");
        product8.setCategory(Category.APPAREL);
        product8.setCurrentPrice(BigDecimal.valueOf(54.99));
        product8.setStockLevel(11);
        product8.setReorderThreshold(12);
        product8.setDemandVelocity(15.0);
        product8.setStatus(Status.ACTIVE);
        productRepository.save(product8);
    }
}