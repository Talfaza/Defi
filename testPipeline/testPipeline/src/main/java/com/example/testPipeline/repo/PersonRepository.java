package com.example.testPipeline.repo;


import com.example.testPipeline.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonRepository extends JpaRepository<Person, Long> {}
