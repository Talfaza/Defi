package org.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import javax.sql.DataSource;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DemoApplicationTests {

    // Autowire the DataSource to prove Spring Boot connected to a database
    @Autowired
    private DataSource dataSource;

    @Test
    void contextLoads() {
        // This test will fail if the application context can't load
        // which it can't do without a database
        System.out.println("Application context loaded successfully.");
    }

    @Test
    void databaseConnectionIsActive() throws SQLException {
        // A simple check to confirm the DataSource is not null and is active
        assertThat(dataSource).isNotNull();
        assertThat(dataSource.getConnection().isValid(1)).isTrue();
        System.out.println("Database connection is active and valid.");
    }
}
