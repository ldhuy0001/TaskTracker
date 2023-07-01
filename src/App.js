import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { API } from "aws-amplify";
import { sort, ascend, descend, prop, pipe } from 'ramda'; // Import the sort function
import { 
  Button,
  Flex,
  Heading, 
  Text, 
  TextField, 
  View, 
  withAuthenticator,
  SelectField,
  Table,
  TableCell,
} from "@aws-amplify/ui-react";

import { Auth } from 'aws-amplify';
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
  updateNote as updateNoteMutation, // Added updateNoteMutation
} from "./graphql/mutations";
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [username, setUsername] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [sortCriteria, setSortCriteria] = useState('status'); // Initialize the sort criteria state variable
  const [sortOrder, setSortOrder] = useState('asc');
  const [editTask, setEditTask] = useState(null); // Added editTask state
  const [isEditFormOpen, setIsEditFormOpen] = useState(false); // Added isEditFormOpen state

  useEffect(() => {
    fetchNotes();
    fetchCurrentUser();
  }, []);

  const sortedNotes = sort(
    (noteA, noteB) => {
      if (sortCriteria === 'status') {
        return (sortOrder === 'asc')
          ? noteA.status.localeCompare(noteB.status)
          : noteB.status.localeCompare(noteA.status);
      } else if (sortCriteria === 'dueDate') {
        return (sortOrder === 'asc')
          ? noteA.dueDate.localeCompare(noteB.dueDate)
          : noteB.dueDate.localeCompare(noteA.dueDate);
      } else if (sortCriteria === 'title') {
        return (sortOrder === 'asc')
          ? noteA.name.localeCompare(noteB.name)
          : noteB.name.localeCompare(noteA.name);
      }
      return 0;
    },
    notes
  );

  async function fetchNotes() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const username = user.username;
      const apiData = await API.graphql({
        query: listNotes,
        variables: { filter: { username: { eq: username } } }
      });

      const notesFromAPI = apiData.data.listNotes.items;


      const { items } = apiData.data.listNotes;

      // Log the first note's status and dueDate
      console.log("Status:", items[0].status);
      console.log("Due Date:", items[0].dueDate);
      console.log("Response Data:", apiData.data);

      setNotes(notesFromAPI);
    } catch (error) {
      console.log('Error:', error);
    }
  }

  async function fetchCurrentUser() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const email = user.attributes.email;
      const username = user.username;
      setUserEmail(email);
      setUsername(username);
    } catch (error) {
      console.log('Error:', error);
    }
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      username: username,
      status: form.get("status"), // Added status field
      dueDate: form.get("dueDate"), // Added dueDate field
    };

    const status = data.status;
    const dueDate = data.dueDate;
    console.log("Status:", status);
    console.log("Due Date:", dueDate);
    console.log("data send to server",data)

    if (editTask) {
      // Update existing task
      await API.graphql({
        query: updateNoteMutation,
        variables: {
          input: {
            id: editTask.id,
            ...data
          }
        },
      });
      setEditTask(null);
      setIsEditFormOpen(false);
      setDueDate(null);
    } else {
      // Create new task
      await API.graphql({
        query: createNoteMutation,
        variables: { input: data },
      });
    }

    fetchNotes();
    setDueDate(null); // Reset the dueDate sta

    event.target.reset();
  }

  async function deleteNote({ id }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await API.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  function editNoteTask(note) {
    setEditTask(note);
    setIsEditFormOpen(true);
    setDueDate(new Date(note.dueDate));
  }

  function cancelEdit() {
    setEditTask(null);
    setIsEditFormOpen(false);
    setDueDate(null);
  }

  Auth.currentAuthenticatedUser()
  .then(user => {
    // Access the user's email from the user object
    const email = user.attributes.email;
    console.log('User email:', email);
    const username = user.username;
    console.log('username',username)
  })
  .catch(error => {
    console.log('Error:', error);
  });

  return (
    <View className="App">
      <Heading level={2}>Hello, {username} - Welcome To Task Tracker</Heading>
      <Button onClick={signOut}>Sign Out</Button>
      <View as="form" margin="3rem 0" onSubmit={createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Task Title"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
            value={editTask ? editTask.name : ''}
            onChange={(event) =>
              setEditTask((prevTask) => ({
                ...prevTask,
                name: event.target.value,
              }))
            }
          />
          <TextField
            name="description"
            placeholder="Task Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
            value={editTask ? editTask.description : ''}
            onChange={(event) =>
              setEditTask((prevTask) => ({
                ...prevTask,
                description: event.target.value,
              }))
            }
          />
          <SelectField
            name="status"
            label="Task Status"
            placeholder="Select Status"
            variation="quiet"
            required
            value={editTask ? editTask.status : ''}
            onChange={(event) =>
              setEditTask((prevTask) => ({
                ...prevTask,
                status: event.target.value,
              }))
            }
          >
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
          </SelectField>
          <DatePicker
            name="dueDate"
            id="dueDate"
            selected={dueDate}
            onChange={(date) => setDueDate(date)}
            required
          />
          {isEditFormOpen ? (
            <>
              <Button type="submit" variation="primary">
                Update Task
              </Button>
              <Button type="button" variation="link" onClick={cancelEdit}>
                Cancel
              </Button>
            </>
          ) : (
            <Button type="submit" variation="primary">
              Create Task
            </Button>
          )}
        </Flex>
      </View>

      <Heading level={3}>Your Current Tasks</Heading>
      <View margin="3rem 0">
        <Flex direction="row" justifyContent="center" marginBottom="1rem">
          <Button
            variation="link"
            onClick={() => {
              setSortCriteria('title');
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
            isActive={sortCriteria === 'title'}
          >
            Sort by Title ({sortOrder === 'asc' ? 'ASC' : 'DESC'})
          </Button>
              <Button
            variation="link"
            onClick={() => {
              setSortCriteria('status');
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
            isActive={sortCriteria === 'status'}
          >
            Sort by Status ({sortOrder === 'asc' ? 'ASC' : 'DESC'})
          </Button>
          <Button
            variation="link"
            onClick={() => {
              setSortCriteria('dueDate');
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
            isActive={sortCriteria === 'dueDate'}
          >
            Sort by Due Date ({sortOrder === 'asc' ? 'ASC' : 'DESC'})
          </Button>
        </Flex>
        <Table>
          <thead>
            <tr>
              <TableCell><strong>Task Title</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Due Date</strong></TableCell>
              <TableCell><strong>Edit/Delete</strong></TableCell>
            </tr>
          </thead>
          <tbody>
            {sortedNotes.map((note) => (
              <tr key={note.id}>
                <TableCell>{note.name}</TableCell>
                <TableCell>{note.description}</TableCell>
                <TableCell>{note.status}</TableCell>
                <TableCell>{note.dueDate}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variation="link"
                    onClick={() => editNoteTask(note)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variation="link"
                    onClick={() => deleteNote(note)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </View>
      

    </View>
  );
};

export default withAuthenticator(App);