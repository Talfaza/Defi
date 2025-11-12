package com.example.testPipeline.model;

import jakarta.persistence.*;

@Entity
public class Person {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    // constructors, getters, setters
    public Person() {}
    public Person(String name){ this.name = name; }
    public Long getId(){ return id; }
    public String getName(){ return name; }
    public void setName(String name){ this.name = name; }
}
