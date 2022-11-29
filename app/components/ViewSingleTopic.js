import React, { useEffect, useState, useContext } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { CSSTransition } from "react-transition-group"
import ReactTooltip from "react-tooltip"
import Axios from "axios"
import { useImmer } from "use-immer"
import Loading from "./Loading"
import NotFound from "./NotFound"
import Post from "./Post"
import DeleteModal from "./DeleteModal"
import StateContext from "../StateContext"
import DispatchContext from "../DispatchContext"
import { Pagination } from "@mui/material"

function ViewSingleTopic(props) {
  const appState = useContext(StateContext)
  const appDispatch = useContext(DispatchContext)
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)
  const { id } = useParams()
  const [topic, setTopic] = useState([])
  const [posts, setPosts] = useState([])
  const loggedIn = Boolean(localStorage.getItem("constructionForumUserToken"))
  const [state, setState] = useImmer({
    isLoading: true,
    notFound: false,
    reloadCounter: 0,
    delete: 0,
    paginationValue: 10,
    pagesNumber: 1,
    pageNumber: 1,
    numberOfRecords: 1,
    orderBy: "",
    isMounted: false,
  })

  useEffect(() => {
    appDispatch({ type: "closeSearch" })
    const ourRequest = Axios.CancelToken.source()
    async function fetchTopic() {
      try {
        const response = await Axios.get(`/api/topic/${id}`, { cancelToken: ourRequest.token })
        setTopic(response.data)
        setState((draft) => {
          draft.isLoading = false
        })
      } catch (e) {
        if (e.response.status === 404) {
          setState((draft) => {
            draft.notFound = true
          })
          console.log("Resource not found.")
        } else {
          console.log("There was a problem or the request was cancelled.")
          navigate(`/`)
        }
      }
    }

    fetchTopic()
    return () => {
      ourRequest.cancel()
    }
  }, [id])

  useEffect(() => {
    const ourRequest = Axios.CancelToken.source()

    async function fetchPosts() {
      try {
        const response = await Axios.get(`/api/post/all_by_topicid/${id}`, { cancelToken: ourRequest.token })
        setPosts(response.data.slice(0, 10))
        setState((draft) => {
          draft.numberOfRecords = response.data.length
          draft.pagesNumber = Math.ceil(response.data.length / 10)
          draft.isMounted = true
        })
      } catch (e) {
        console.log("There was a problem or the request was cancelled." + e)
      }
    }

    fetchPosts()
    return () => {
      ourRequest.cancel()
    }
  }, [id, state.reloadCounter])

  useEffect(() => {
    async function fetchData() {
      try {
        if (state.isMounted) {
          if (state.orderBy !== "") {
            getPaginatedPosts()
          } else {
            getPaginatedAndSortedPosts()
          }
        }
      } catch (e) {
        console.log("there was a problem fetching the data" + e)
      }
    }
    fetchData()
  }, [state.pageNumber, state.paginationValue])

  async function getPaginatedPosts() {
    const response = await Axios.get(`/api/post/all_by_topicid/${id}?orderby=${state.orderBy}&limit=${state.paginationValue}&page=${state.pageNumber}`)
    setState((draft) => {
      setPosts(response.data)
      draft.isLoading = false
    })
  }

  async function getPaginatedAndSortedPosts() {
    const response = await Axios.get(`/api/post/all_by_topicid/${id}?limit=${state.paginationValue}&page=${state.pageNumber}`)
    setState((draft) => {
      setPosts(response.data)
      draft.isLoading = false
    })
  }

  useEffect(() => {
    async function fetchData() {
      try {
        if (state.isMounted) {
          getSortedPosts()
        }
      } catch (e) {
        console.log("there was a problem fetching the data" + e)
      }
    }
    fetchData()
  }, [state.orderBy])

  async function getSortedPosts() {
    const resposne = await Axios.get(`/api/post/all_by_topicid/${id}?orderby=${state.orderBy}`)
    setState((draft) => {
      setPosts(resposne.data.slice(0, state.paginationValue))
      draft.isLoading = false
    })
  }

  function reload() {
    setState((draft) => {
      draft.reloadCounter++
    })
  }

  function sort(value) {
    setState((draft) => {
      draft.pageNumber = 1
      draft.orderBy = value
    })
  }

  function deletePopup() {
    setIsDeleting((prev) => !prev)
  }

  function paginate(value) {
    setState((draft) => {
      draft.pageNumber = 1
      draft.paginationValue = value
      draft.pagesNumber = Math.ceil(state.numberOfRecords / value)
    })
  }

  function renderPosts() {
    return posts.map((post) => {
      return <Post post={post} key={post.id} author={post.user} reload={reload} />
    })
  }

  function handlePage(event) {
    setState((draft) => {
      draft.pageNumber = parseInt(event.target.textContent)
    })
  }

  async function handleDelete() {
    const ourRequest = Axios.CancelToken.source()
    try {
      await Axios.delete(`/api/topic/${id}`, { headers: { Authorization: `Bearer ${appState.user.token}` } }, { cancelToken: ourRequest.token })
      appDispatch({ type: "flashMessage", value: "Topic successfully deleted!", messageType: "message-green" })
      navigate("/")
    } catch (e) {
      console.log("There was a problem while deleting the topic", e)
    }
    return () => {
      ourRequest.cancel()
    }
  }

  function showContextDependingOnPermission() {
    if (appState.user.isAdmin || appState.user.isSupport) {
      return (
        <div className="font-weight-bold text-left">
          <span className="mr-4" style={{ fontSize: "40px" }}>
            {topic.name}
          </span>{" "}
          <Link to={`/topic/edit/${id}`} data-tip="Edit" data-for="edit" className="text-primary mr-2">
            <span className="material-symbols-outlined link-black mr-2"> edit </span>
          </Link>
          <ReactTooltip id="edit" className="custom-tooltip" />
          <span onClick={deletePopup} className="material-symbols-outlined link-black" data-tip="Delete" data-for="delete">
            delete
          </span>
          <CSSTransition in={isDeleting} timeout={330} classNames="liveValidateMessage" unmountOnExit>
            <div className="delete-absolute container">
              <div className="delete-pop col-4 ml-5 liveValidateMessage-delete ml-3">
                <DeleteModal delete={handleDelete} noDelete={deletePopup} relatedItemsLength={posts.length} relatedItemsType={"post"} />
              </div>
            </div>
          </CSSTransition>
          <ReactTooltip id="delete" className="custom-tooltip" />
        </div>
      )
    }
    return (
      <div className="font-weight-bold text-left">
        <span className="mr-4" style={{ fontSize: "40px" }}>
          {topic.name}
        </span>{" "}
      </div>
    )
  }

  if (state.notFound) return <NotFound />
  if (state.isLoading) return <Loading />
  return (
    <div className="main container d-flex flex-column">
      <div className="mt-5"></div>
      <Link className="text-primary medium font-weight-bold mb-3" to={`/`}>
        &laquo; Back to topics
      </Link>
      {showContextDependingOnPermission()}
      <div className="content mt-2 mr-auto p-4">{topic.description}</div>
      <div className="content container d-flex flex-column mt-4">
        <div className="d-flex flex-row">
          <div className="ml-4">
            <h4 className="font-weight-bold">Posts</h4>
          </div>
          <div className="ml-auto d-flex flex-row align-items-center">
            {loggedIn ? (
              <button className="single-topic-content p-1 mr-3" style={{ backgroundColor: "DarkBlue" }} onClick={() => navigate(`/post/create`, { state: { topic: topic } })}>
                <text data-tip="Add new post!" data-for="add-new-post">
                  New Post
                </text>
                <ReactTooltip id="add-new-post" className="custom-tooltip" />
              </button>
            ) : null}
            <select
              className="mr-3"
              name="Pagination"
              id="pagination"
              onChange={(e) => {
                paginate(e.target.value)
              }}
            >
              <option value="" disabled selected>
                Pagination
              </option>
              <option>10</option>
              <option>20</option>
              <option>30</option>
              <option>40</option>
            </select>
            <select
              className="mr-3"
              name="Sorting"
              id="sorting"
              onChange={(e) => {
                sort(e.target.value)
              }}
            >
              <option value="id.asc" disabled selected>
                Sorting
              </option>
              <option value="title.asc">Alphabetically</option>
              <option value="createdAt.desc">The newest topics</option>
              <option value="createdAt.asc">The oldest topics</option>
              <option value="updatedAt.desc">Last updated</option>
            </select>
            <div className="mr-4">
              <span className="material-symbols-outlined"> tune </span>
            </div>
          </div>
        </div>
        {posts.length == 0 ? <span className="font-weight-bold text-center p-5">There are no posts for this topic yet. Feel free to create one!</span> : renderPosts()}
        <div className="mt-2 align-items-right">
          <Pagination count={state.pagesNumber} page={state.pageNumber} defaultPage={1} shape="rounded" onChange={handlePage} />
        </div>
      </div>
    </div>
  )
}

export default ViewSingleTopic
