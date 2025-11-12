package com.example.testPipeline;

import com.example.testPipeline.model.Person;
import com.example.testPipeline.repo.PersonRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/people")
public class PersonController {
    private final PersonRepository repo;
    public PersonController(PersonRepository repo){ this.repo = repo; }

    @GetMapping
    public List<Person> all(){ return repo.findAll(); }

    @PostMapping
    public Person create(@RequestBody Person p){ return repo.save(p); }
}
